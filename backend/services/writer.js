// Academic Introduction Writer
// Generates a detailed introduction section from validated paper references.
// No AI API required — uses NLP-inspired heuristics, abstract extraction,
// and structured academic templates grounded in the actual paper content.

const STOP_WORDS = new Set([
  'a','an','the','and','or','but','in','on','at','to','for','of','with',
  'by','from','up','about','into','through','during','before','after',
  'above','below','between','each','few','more','most','other','some',
  'such','than','too','very','can','will','just','should','now','then',
  'also','both','even','here','however','is','are','was','were','be',
  'been','being','have','has','had','do','does','did','not','this','that',
  'these','those','its','it','we','our','their','they','he','she','his',
  'her','which','who','whom','when','where','why','how','all','any',
  'because','as','until','while','although','though','since','unless',
  'if','whether','so','yet','both','either','neither','nor','only',
  'own','same','than','too','very','s','t','can','will','don','would',
  'there','paper','study','research','proposed','approach','method',
  'results','show','work','using','used','based','two','three','four',
  'one','new','different','large','high','low','first','second','include',
  'including','present','provides','provide','allows','allow','make',
  'could','further','thus','therefore','hence','moreover','furthermore'
]);

// ─── Keyword Extraction ───────────────────────────────────────────────────────

function tokenize(text) {
  return text.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !STOP_WORDS.has(w));
}

function extractKeywords(paper, topN = 15) {
  const titleTokens = tokenize(paper.title);
  const abstractTokens = tokenize(paper.abstract || '');

  const freq = {};
  // Title words weighted 3×
  for (const w of titleTokens) freq[w] = (freq[w] || 0) + 3;
  for (const w of abstractTokens) freq[w] = (freq[w] || 0) + 1;

  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([w]) => w);
}

function computeIDF(paperList) {
  const df = {};
  for (const paper of paperList) {
    const kws = new Set(extractKeywords(paper, 30));
    for (const w of kws) df[w] = (df[w] || 0) + 1;
  }
  const N = paperList.length;
  const idf = {};
  for (const [w, count] of Object.entries(df)) {
    idf[w] = Math.log((N + 1) / (count + 1)) + 1;
  }
  return idf;
}

function tfidfKeywords(paper, idf, topN = 12) {
  const titleTokens = tokenize(paper.title);
  const abstractTokens = tokenize(paper.abstract || '');
  const tf = {};
  for (const w of titleTokens) tf[w] = (tf[w] || 0) + 3;
  for (const w of abstractTokens) tf[w] = (tf[w] || 0) + 1;

  const total = Object.values(tf).reduce((s, v) => s + v, 0) || 1;
  const scored = Object.entries(tf).map(([w, c]) => ({
    word: w,
    score: (c / total) * (idf[w] || 1)
  }));
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topN).map(s => s.word);
}

// ─── Clustering ───────────────────────────────────────────────────────────────

function jaccardSimilarity(setA, setB) {
  const intersection = setA.filter(w => setB.includes(w)).length;
  const union = new Set([...setA, ...setB]).size;
  return union === 0 ? 0 : intersection / union;
}

function clusterPapers(papers, idf, targetClusters = 6) {
  const keywordSets = papers.map(p => tfidfKeywords(p, idf, 12));
  const n = papers.length;
  const assigned = new Array(n).fill(-1);
  const clusters = [];

  for (let i = 0; i < n; i++) {
    if (assigned[i] !== -1) continue;

    let bestCluster = -1;
    let bestSim = 0.12; // minimum similarity threshold

    for (let c = 0; c < clusters.length; c++) {
      // Compare against cluster centroid (union of keywords)
      const centroid = clusters[c].keywords;
      const sim = jaccardSimilarity(keywordSets[i], centroid);
      if (sim > bestSim) { bestSim = sim; bestCluster = c; }
    }

    if (bestCluster === -1 && clusters.length < targetClusters) {
      clusters.push({ indices: [i], keywords: [...keywordSets[i]] });
      assigned[i] = clusters.length - 1;
    } else if (bestCluster !== -1) {
      clusters[bestCluster].indices.push(i);
      assigned[i] = bestCluster;
      // Update centroid: union of keywords
      const newKws = new Set([...clusters[bestCluster].keywords, ...keywordSets[i]]);
      clusters[bestCluster].keywords = [...newKws].slice(0, 20);
    }
  }

  // Papers not assigned → put in last cluster or create overflow cluster
  for (let i = 0; i < n; i++) {
    if (assigned[i] === -1) {
      if (clusters.length === 0) clusters.push({ indices: [], keywords: [] });
      clusters[clusters.length - 1].indices.push(i);
    }
  }

  // Label each cluster with its top keywords
  return clusters
    .filter(c => c.indices.length > 0)
    .map(c => ({
      papers: c.indices.map(i => papers[i]),
      label: c.keywords.slice(0, 4).join(', ')
    }))
    .sort((a, b) => b.papers.length - a.papers.length);
}

// ─── Sentence Extraction ──────────────────────────────────────────────────────

function splitSentences(text) {
  return text
    .replace(/([.?!])\s+(?=[A-Z])/g, '$1\n')
    .split('\n')
    .map(s => s.trim())
    .filter(s => s.length > 20 && s.length < 400);
}

const OBJECTIVE_MARKERS = ['propos', 'present', 'introduc', 'develop', 'this paper', 'this work', 'we propose', 'we present', 'we develop', 'our approach', 'our method'];
const RESULT_MARKERS = ['achiev', 'outperform', 'demonstrat', 'result', 'show that', 'shows that', 'accuracy', 'improve', 'reduce', 'increase', 'superior', 'significant'];
const PROBLEM_MARKERS = ['challenge', 'problem', 'difficult', 'limitation', 'lack', 'require', 'need', 'critical', 'important', 'complex'];

function scoreAbstractSentence(sentence, idx, total) {
  const s = sentence.toLowerCase();
  let score = 0;
  if (idx === 0) score += 3;
  if (idx === total - 1) score += 2;
  if (OBJECTIVE_MARKERS.some(m => s.includes(m))) score += 4;
  if (RESULT_MARKERS.some(m => s.includes(m))) score += 3;
  if (PROBLEM_MARKERS.some(m => s.includes(m))) score += 2;
  const wc = sentence.split(/\s+/).length;
  if (wc >= 15 && wc <= 40) score += 1;
  return score;
}

function extractKeySentences(abstract, n = 2) {
  if (!abstract) return [];
  const sentences = splitSentences(abstract);
  if (sentences.length === 0) return [];

  const scored = sentences.map((s, i) => ({
    text: s,
    score: scoreAbstractSentence(s, i, sentences.length)
  }));

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, n).map(s => s.text);
}

// ─── Author Formatting ────────────────────────────────────────────────────────

function formatAuthors(authors) {
  if (!authors || authors.length === 0) return 'Anonymous';
  const lastNames = authors.map(a => {
    const parts = a.trim().split(/\s+/);
    return parts[parts.length - 1];
  });
  if (lastNames.length === 1) return lastNames[0];
  if (lastNames.length === 2) return `${lastNames[0]} and ${lastNames[1]}`;
  return `${lastNames[0]} et al.`;
}

function formatCitation(paper, index) {
  return `[${index}]`;
}

function formatVenue(paper) {
  const venue = paper.venue || '';
  if (!venue) return paper.year ? `(${paper.year})` : '';
  return `${venue} (${paper.year})`;
}

// ─── Text Helpers ─────────────────────────────────────────────────────────────

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Remove AI-style clichés from generated sentences
function cleanText(text) {
  return text
    .replace(/\bgroundbreaking\b/gi, 'significant')
    .replace(/\brevolutionar[yi]\b/gi, 'transformative')
    .replace(/\bunprecedented\b/gi, 'notable')
    .replace(/\bread?ily\b/gi, 'directly')
    .replace(/\bcutting-edge\b/gi, 'advanced')
    .replace(/\bstate-of-the-art state-of-the-art\b/gi, 'state-of-the-art');
}

// ─── Paragraph Generators ─────────────────────────────────────────────────────

function generateOpening(topic, papers, fieldNames) {
  const currentYear = new Date().getFullYear();
  const earliestYear = Math.min(...papers.map(p => p.year).filter(Boolean));
  const yearsSpan = currentYear - earliestYear;
  const fieldList = fieldNames.length > 0
    ? fieldNames.slice(0, 3).join(', ')
    : 'engineering and applied sciences';

  const openings = [
    `The study of ${topic} has emerged as a central area of investigation across ${fieldList}, attracting sustained research attention over the past ${yearsSpan} years. As the demands placed on modern systems grow increasingly complex, a thorough understanding of the foundational principles and recent advances in this domain has become indispensable for both academic inquiry and practical application.`,
    `Over the past ${yearsSpan} years, ${topic} has developed into one of the most actively researched subjects within ${fieldList}. The increasing complexity of real-world systems, combined with the availability of new analytical and computational tools, has accelerated the pace of discovery and expanded the scope of investigation considerably.`,
    `Research into ${topic} occupies a prominent position within ${fieldList}, reflecting the significance of this subject to both theoretical understanding and practical implementation. Since the early contributions in ${earliestYear}, the field has expanded substantially, with investigators addressing a widening range of questions using increasingly sophisticated methodologies.`
  ];

  const continuation = [
    ` This introduction provides a structured review of the literature, examining key contributions, identifying persistent challenges, and outlining the conceptual landscape that defines current scholarship in this area.`,
    ` The present section surveys the principal developments in this literature, tracing the evolution of core concepts and highlighting areas where further investigation is warranted.`,
    ` The following review synthesizes findings from ${papers.length} peer-reviewed sources, organizing the literature thematically to clarify relationships among competing approaches and to identify directions for continued inquiry.`
  ];

  return pick(openings) + pick(continuation);
}

function generateBackground(topic, papers) {
  const years = papers.map(p => p.year).filter(Boolean).sort();
  const oldestYear = years[0];
  const medianYear = years[Math.floor(years.length / 2)];

  const sentences = [
    `The theoretical foundations of ${topic} can be traced to investigations conducted in the early ${Math.floor(oldestYear / 10) * 10}s, when researchers first began to formalize the underlying principles governing this domain.`,
    `Early work in this area was largely concerned with establishing baseline methodologies and characterizing the fundamental properties of the systems under study.`,
    `As the field matured through the ${Math.floor(medianYear / 10) * 10}s, attention shifted toward addressing more complex scenarios and improving the generalizability of proposed approaches.`,
    `The proliferation of computational resources and the growing availability of experimental data have played a significant role in shaping the trajectory of research, enabling investigators to tackle problems of increasing scale and complexity.`,
    `A defining characteristic of scholarship in this area is the interdisciplinary nature of the contributions, drawing on methodologies from adjacent fields to address questions that resist solution through any single discipline alone.`,
    `Parallel advances in instrumentation, data collection, and modeling have created opportunities for more rigorous validation of theoretical predictions and for the identification of previously unobserved phenomena.`
  ];

  return sentences.join(' ');
}

function generateClusterIntro(cluster, clusterIndex) {
  const label = cluster.label;
  const count = cluster.papers.length;
  const years = cluster.papers.map(p => p.year).filter(Boolean).sort();
  const yearRange = years.length > 1
    ? `between ${years[0]} and ${years[years.length - 1]}`
    : years.length === 1 ? `in ${years[0]}` : 'in recent years';

  const intros = [
    `A substantial portion of the literature has been devoted to investigations concerning ${label}. A total of ${count} relevant stud${count === 1 ? 'y' : 'ies'} addressing these themes were identified, published ${yearRange}, collectively providing a detailed account of the challenges and solutions associated with this sub-domain.`,
    `Among the thematic areas that have received considerable attention, research into ${label} stands out for the breadth and depth of contributions. The ${count} work${count === 1 ? '' : 's'} examined here, spanning ${yearRange}, represent a coherent body of scholarship that has progressively refined the understanding of this problem space.`,
    `The relationship between ${label} and the broader topic of concern has been examined from multiple perspectives. Investigations conducted ${yearRange} have collectively advanced the conceptual and methodological toolkit available to researchers working in this area.`
  ];

  return pick(intros);
}

function generatePaperParagraph(papers, citationMap, paperRole) {
  const sentences = [];

  for (const paper of papers) {
    const authStr = formatAuthors(paper.authors);
    const citStr = formatCitation(paper, citationMap[paper.paperId]);
    const year = paper.year;
    const keySentences = extractKeySentences(paper.abstract, 2);
    const venue = paper.venue || '';

    // Choose a verb template based on paper role
    const verbTemplates = paperRole === 'foundational'
      ? ['established', 'demonstrated', 'showed', 'reported', 'identified', 'characterized']
      : ['proposed', 'developed', 'introduced', 'presented', 'extended', 'investigated'];

    const verb = pick(verbTemplates);

    if (keySentences.length >= 2) {
      // Use extracted sentences, lightly reformatted
      const obj = keySentences[0].replace(/^(this paper|this work|we|the authors?)\s+(propose[sd]?|present[ed]?|introduc[ed]+|develop[ed]+)\s+/i, '');
      const res = keySentences[1];

      const templates = [
        `${authStr} ${citStr} ${verb} ${obj.charAt(0).toLowerCase() + obj.slice(1).replace(/\.$/, '')}. ${res}`,
        `In the work by ${authStr} ${citStr}, the authors ${verb} ${obj.charAt(0).toLowerCase() + obj.slice(1).replace(/\.$/, '')}. ${res}`,
        `A study by ${authStr} published in ${year} ${citStr} ${verb} ${obj.charAt(0).toLowerCase() + obj.slice(1).replace(/\.$/, '')}. The authors reported that ${res.charAt(0).toLowerCase() + res.slice(1)}`
      ];
      sentences.push(pick(templates));
    } else if (keySentences.length === 1) {
      const obj = keySentences[0];
      sentences.push(
        `${authStr} ${citStr} investigated aspects of this problem, noting that ${obj.charAt(0).toLowerCase() + obj.slice(1).replace(/\.$/, '')}. This contribution ${venue ? `appeared in ${venue} and` : ''} advanced the broader discussion by providing new empirical support for the approaches considered.`
      );
    } else {
      // No abstract sentences available
      sentences.push(
        `${authStr} ${citStr} examined this research question and reported findings relevant to ${paper.title.replace(/[.?!]$/, '').toLowerCase()}. The work contributes to the literature by extending prior analyses and offering methodological insights applicable to related problem settings.`
      );
    }
  }

  // Group sentences into cohesive paragraph with connectives
  const connectives = [
    'Building on these findings, ',
    'In a related investigation, ',
    'Extending this line of research, ',
    'A complementary perspective was offered by ',
    'Subsequent work in this area ',
    'Consistent with these observations, ',
    'Taking a different approach, ',
    'Along similar lines, '
  ];

  const paragraphLines = sentences.map((s, i) => {
    if (i === 0) return s;
    const conn = pick(connectives);
    if (conn.endsWith('by ')) {
      // sentence starts with author name, append after connector
      return conn + s.charAt(0).toLowerCase() + s.slice(1);
    }
    return conn + s.charAt(0).toLowerCase() + s.slice(1);
  });

  return paragraphLines.join(' ');
}

function generateResearchGaps(topic, papers) {
  const recentPapers = papers
    .filter(p => p.year >= new Date().getFullYear() - 5)
    .sort((a, b) => b.citationCount - a.citationCount)
    .slice(0, 4);

  const recentCites = recentPapers.length > 0
    ? recentPapers.map((p, i) => `${formatAuthors(p.authors)} [${i + 1}]`).join(', ')
    : 'several recent studies';

  const gaps = [
    `Despite the volume and diversity of contributions surveyed above, a number of substantive challenges remain incompletely resolved. Existing approaches frequently assume idealized conditions that may not hold in practical settings, and the transferability of findings across different experimental contexts has not been systematically established. Recent investigations, including those by ${recentCites}, have explicitly acknowledged these limitations, pointing to the need for more generalizable frameworks.`,
    `A critical examination of the literature reveals several persistent gaps. First, the majority of published studies have been conducted under controlled conditions, leaving open questions about the robustness of proposed methods in real-world deployment scenarios. Second, comparative evaluations across competing approaches remain limited, making it difficult to draw definitive conclusions about relative performance. Third, the scalability of existing techniques to problems of greater complexity has not been fully characterized. These gaps collectively point to directions where further investigation is likely to yield substantial contributions.`,
    `Notwithstanding the considerable progress documented in the foregoing review, the literature on ${topic} is not without its limitations. A recurring concern is the reliance on benchmark datasets that may not adequately represent the variability encountered in operational settings. Furthermore, many studies optimize for a narrow set of performance criteria, potentially at the expense of other desirable properties. The lack of standardized evaluation protocols has also hindered systematic comparisons across research groups, slowing the accumulation of reliable, reproducible knowledge.`
  ];

  return pick(gaps);
}

function generateMotivationAndContributions(topic, papers, clusters) {
  const clusterLabels = clusters.slice(0, 3).map(c => c.label).join('; ');

  const motivations = [
    `The preceding analysis of the literature motivates a systematic and integrative approach to the study of ${topic}. By consolidating findings across thematic areas including ${clusterLabels}, the present work seeks to provide a coherent synthesis that resolves apparent contradictions and identifies promising directions for future research.`,
    `The gaps and limitations identified above provide the primary motivation for the work reviewed in this introduction. A comprehensive treatment of ${topic} requires attention to the full range of factors highlighted in the literature, including those related to ${clusterLabels}. The contributions of the studies surveyed here collectively advance the state of knowledge in each of these dimensions.`,
    `Against the backdrop of the challenges documented above, the work examined in this introduction makes several contributions to the existing body of knowledge on ${topic}. These contributions span the thematic areas of ${clusterLabels}, and collectively represent a meaningful advance over the methods and frameworks previously available.`
  ];

  return pick(motivations);
}

function generateOrganization() {
  const templates = [
    `The remainder of this paper is organized as follows. Section II describes the experimental methodology and data collection procedures. Section III presents the main results and analytical findings. Section IV provides a comparative discussion of the results in relation to prior work. Section V outlines the limitations of the present study and suggests directions for future investigation. Section VI concludes the paper.`,
    `The structure of the paper is as follows. The methodology is described in Section II, covering both the experimental design and the analytical framework employed. Section III reports the results, followed by a discussion in Section IV that situates the findings within the broader literature. Section V addresses limitations and future work, and Section VI presents the conclusions.`,
    `The paper proceeds as follows. Section II outlines the theoretical background and methodological approach. Section III presents and analyzes the experimental results. Section IV offers a critical discussion and comparison with related work. Section V concludes with a summary of the main findings and a discussion of avenues for future research.`
  ];
  return pick(templates);
}

// ─── Main Generation Function ─────────────────────────────────────────────────

function generateIntroduction(topic, papers, selectedFieldNames) {
  if (!papers || papers.length === 0) {
    return { text: '', references: [], wordCount: 0 };
  }

  // Sort papers: most cited first
  const sorted = [...papers].sort((a, b) => (b.citationCount || 0) - (a.citationCount || 0));

  // Build IDF and clusters
  const idf = computeIDF(sorted);
  const clusters = clusterPapers(sorted, idf, Math.min(7, Math.ceil(sorted.length / 4)));

  // Build citation map: paperId → citation number
  const citationMap = {};
  let citationIndex = 1;

  // Assign citation numbers in cluster order
  for (const cluster of clusters) {
    for (const paper of cluster.papers) {
      if (!citationMap[paper.paperId]) {
        citationMap[paper.paperId] = citationIndex++;
      }
    }
  }

  const paragraphs = [];

  // 1. Opening
  paragraphs.push(generateOpening(topic, sorted, selectedFieldNames));

  // 2. Background
  paragraphs.push(generateBackground(topic, sorted));

  // 3. Thematic literature review — each cluster gets 2-3 paragraphs
  for (let ci = 0; ci < clusters.length; ci++) {
    const cluster = clusters[ci];
    const clusterPapers = cluster.papers.sort((a, b) => (b.citationCount || 0) - (a.citationCount || 0));

    // Cluster intro paragraph
    paragraphs.push(generateClusterIntro(cluster, ci));

    // Split papers into batches of 4-5 for paragraphs
    const batchSize = Math.ceil(clusterPapers.length / Math.ceil(clusterPapers.length / 5));
    for (let i = 0; i < clusterPapers.length; i += batchSize) {
      const batch = clusterPapers.slice(i, i + batchSize);
      const role = i === 0 ? 'foundational' : 'recent';
      paragraphs.push(generatePaperParagraph(batch, citationMap, role));
    }
  }

  // 4. Research gaps
  paragraphs.push(generateResearchGaps(topic, sorted));

  // 5. Motivation and contributions
  paragraphs.push(generateMotivationAndContributions(topic, sorted, clusters));

  // 6. Paper organization
  paragraphs.push(generateOrganization());

  // Build reference list
  const references = sorted
    .filter(p => citationMap[p.paperId])
    .sort((a, b) => citationMap[a.paperId] - citationMap[b.paperId])
    .map(p => {
      const authorStr = (p.authors || []).map(a => {
        const parts = a.trim().split(/\s+/);
        if (parts.length >= 2) {
          const last = parts[parts.length - 1];
          const initials = parts.slice(0, -1).map(n => n[0].toUpperCase() + '.').join(' ');
          return `${last}, ${initials}`;
        }
        return a;
      }).join(', ');

      const venue = p.venue || '';
      const doi = p.crossrefDoi || p.doi || '';

      return {
        index: citationMap[p.paperId],
        text: `${authorStr}, "${p.title}," ${venue}${venue ? ', ' : ''}${p.year}.${doi ? ' DOI: ' + doi : ''}`,
        paper: p
      };
    });

  const fullText = paragraphs.map(p => cleanText(p)).join('\n\n');
  const wordCount = fullText.split(/\s+/).length;

  return { text: fullText, paragraphs: paragraphs.map(p => cleanText(p)), references, wordCount };
}

module.exports = { generateIntroduction };
