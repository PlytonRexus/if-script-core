# **Engineering Static State Space Flattening for Interactive Fiction within the Legacy Mobipocket Ecosystem**

The transition of digital interactive fiction from sophisticated, event-driven web environments to the structurally rigid confines of e-ink hardware necessitates a profound architectural shift in how narrative state is managed and presented. While modern interactive fiction (IF) frameworks, specifically Node.js-based tools like IF-SCRIPT, are designed to leverage dynamic runtimes for state persistence and conditional logic, the Amazon Kindle’s legacy MOBI format remains a essentially static medium.1 To bridge this technological divide, developers must employ a methodology known as state space flattening, wherein a dynamic, variable-heavy narrative is algorithmically deconstructed into a directed graph of static pages linked via internal hyperlinks.3 This report provides an exhaustive technical analysis of the mechanisms required to utilize the IF-SCRIPT core engine for the generation of flattened MOBI files, with a particular focus on pre-rendering variable domains, managing combinatorial explosion, and optimizing for the technical constraints of the Mobipocket format.

## **Architectural Foundations of IF-SCRIPT and the Challenge of Portability**

The IF-SCRIPT ecosystem, currently at version 0.5.8+, represents a modern approach to interactive storytelling, characterized by a decoupled architecture that separates authorship from runtime execution.1 The core parsing engine, if-script-core, transforms a custom, Markdown-inspired syntax into a JSON-based story structure that is typically interpreted by a browser-based runtime.1 This runtime facilitates advanced features such as string interpolation, arithmetic operations, logical conditionals, and complex data structures like arrays.1 In a standard web deployment, the runtime maintains a persistent state object in the browser's memory, updating the Document Object Model (DOM) as the player makes choices.1

The primary obstacle in porting IF-SCRIPT to the Kindle MOBI format is the absence of a programmable runtime on e-ink devices. While the IF-SCRIPT authoring workflow includes a static diagnostics engine (ifs check) to validate narrative logic, the actual execution of that logic—such as determining which text to display based on the value of a strength variable—is deferred to the runtime.1 In the MOBI format, which lacks JavaScript support on most e-ink models, every potential outcome of a conditional statement must be pre-rendered into a unique static section.6 This requires a fundamental reimagining of the ifs compile command, shifting it from a tool that produces a JSON data file to a comprehensive compiler that generates an exhaustive set of pre-rendered HTML fragments representing every reachable state in the story's possibility space.1

### **Functional Components of IF-SCRIPT**

The following table delineates the core components of the IF-SCRIPT architecture and the specific transformations required to facilitate a static MOBI export.

| Component | Current Dynamic Role | Static Transformation for MOBI |
| :---- | :---- | :---- |
| **if-script-core** | Parses syntax into an abstract syntax tree (AST). | Serves as the base for the state-traversal engine. |
| **Logic Engine** | Evaluates variables and expressions at runtime. | Must be executed during compilation to resolve all branches. |
| **Variables** | Stored in memory; updated via @set or arithmetic. | Domains must be iterated to generate permutations of pages. |
| **Markdown Parser** | Renders text to HTML in the browser via Showdown. | Used at compile-time to produce static HTML sections. |
| **Timers** | Uses animated progress ribbons and JS intervals. | Replaced by choice-based bottlenecks or textual warnings. |
| **Diagnostics** | Validates syntax and basic logic flow. | Must audit state space to prevent exceeding 32,000 links. |

1

## **Technical Specifications and Limitations of the Mobipocket Format**

The MOBI format, originally developed for the Mobipocket Reader and subsequently acquired by Amazon, is based on the Palm Database Format (PDB).2 Internally, a MOBI file is a collection of records, where each text record is limited to exactly 4,096 bytes.2 While the format supports basic HTML and CSS, its implementation on legacy Kindle devices (MOBI7) is significantly more constrained than the modern Kindle Format 8 (KF8).7 For authors targeting the broadest possible range of Kindle hardware, the technical limitations of MOBI7 dictate the design of the interactive experience.13

### **Structural Constraints and Header Architecture**

The MOBI header contains critical metadata that determines how the device interprets the file's contents. It includes the compression type, with options for no compression, PalmDOC compression, or the more advanced HUFF/CDIC scheme.2 The header also specifies the text encoding, typically either CP1252 or UTF-8, and includes offsets for image records and the orthographic index.2

A critical constraint for interactive fiction is the maximum number of internal hyperlinks. Historical analysis of the MOBI specification indicates a hard limit of approximately 32,000 internal links within a single document.2 In a flattened gamebook structure, where every player choice is represented by a hyperlink to a specific anchor, this limit effectively caps the total complexity of the narrative. If an IF-SCRIPT story features high-frequency branching and extensive state-tracking, the number of unique static pages—and therefore the number of links required to navigate them—can easily exceed this threshold.6

| Field | Length / Value | Description |
| :---- | :---- | :---- |
| **Identifier** | 4 bytes ('MOBI') | Confirms the file type. |
| **Header Length** | 4 bytes | Variable length (e.g., 228, 232, 256). |
| **Mobi Type** | 4 bytes | 2 \= Book, 518 \= HTML, etc. |
| **Text Encoding** | 4 bytes | 1252 (WinLatin1) or 65001 (UTF-8). |
| **Unique ID** | 4 bytes | A randomly generated identifier. |
| **First Image Index** | 4 bytes | Record number where images begin. |
| **Max Links** | 32,000 | Maximum supported internal hyperlinks. |

2

### **Hyperlink Behavior and E-Ink Latency**

Kindle e-ink screens operate with a significant refresh lag compared to standard digital displays.15 Navigation via hyperlinks triggers a screen update that can be jarring for the user if it occurs too frequently. Furthermore, the Kindle's internal link resolution differs from the standard web model. While web browsers may attempt to center an anchor within the viewport, the Kindle system consistently places the target anchor at the very top of the screen.7

This behavior imposes a specific formatting requirement: if an anchor is placed inside a block-level element that applies styles (such as a header tag), the Kindle may fail to load the styles for that element during the jump.7 Amazon recommends placing the anchor immediately before the block-level element (e.g., \<a id="target"\>\</a\>\<h1\>Scene Title\</h1\>) to ensure visual consistency.7 Additionally, the use of the "title" attribute within an anchor tag has been documented to break link functionality on certain e-ink models, necessitating a minimalist approach to HTML generation.17

## **Theoretical Framework of State Space Flattening**

In the context of interactive fiction, a "state" is a snapshot of the game world at a specific moment, defined by the current narrative node and the values of all active variables.3 The process of flattening involves converting this dynamic state space into a static graph where each vertex is a unique combination of narrative content and variable values, and each edge is a player action.4

### **The Combinatorial Explosion Problem**

The most significant theoretical challenge in static conversion is the combinatorial explosion. Every new variable introduced into the story increases the potential number of states exponentially.6 If a character possesses three boolean flags (e.g., has\_sword, is\_poisoned, met\_king), a single narrative room could potentially exist in ![][image1] different versions. As the number of variables grows, the required number of static pages can quickly spiral out of control.6

To quantify this, we can model the total state space ![][image2] using the following LaTeX expression, where ![][image3] is the set of narrative passages and ![][image4] is the set of variables, each with a domain ![][image5]:

![][image6]  
However, not every variable is relevant to every passage. A more efficient flattening algorithm only generates permutations for the subset of variables ![][image7] that are actually referenced in passage ![][image8]. The optimized state space ![][image9] is therefore:

![][image10]  
4

### **Pre-rendering Variable Domains**

The user's specific request to pre-render all possible values a variable can take is a viable strategy for low-to-medium complexity games. In this model, the Node.js tool must identify the domain of each variable. For boolean variables, the domain is ![][image11]. For numeric variables, the tool must determine the range of values that actually affect the narrative.1

For example, if a gold variable affects the story at three thresholds (less than 10, between 10 and 50, and over 50), the continuous variable can be discretized into three symbolic values for the purpose of page generation.22 This "bundling" technique ensures that the number of pre-rendered pages remains manageable while preserving all meaningful player agency.21

## **Implementation Strategy for the Node.js Toolset**

The development of a MOBI-focused exporter for IF-SCRIPT requires extending the existing CLI and core engine to handle exhaustive graph traversal and static asset generation.

### **Headless Traversal and State Discovery**

The first phase of the implementation involves a Node.js-based "explorer" that traverses the story's logic without user input. This explorer maintains a virtual state and follows every possible choice branch.18 To prevent infinite loops in narratives with cycles, the tool must maintain a hash map of previously visited states.3 A state is defined as a unique tuple of (passage\_id, variable\_state\_hash).4

During traversal, the tool must:

1. Parse the current IF-SCRIPT passage to identify all @set operations and conditional branches.1  
2. Evaluate logical expressions using the current virtual state.1  
3. Identify the domain of each variable referenced in the passage's conditional logic.21  
4. Generate a list of all possible variable permutations that result in unique narrative outcomes.23  
5. Recurse through each choice to discover the next set of reachable states.18

### **Static Page Generation and String Interpolation**

Once the state space has been mapped, the tool moves to the generation phase. For each unique state, a static HTML fragment is created. The tool utilizes the IF-SCRIPT core's existing dependency on the Showdown library to convert Markdown text into HTML.1

Crucially, any string interpolation—such as displaying a character's name via ${playerName}—must be resolved at this stage.1 Since the Kindle cannot perform this interpolation at runtime, a separate version of the page must be generated for every unique value of the variables included in text strings.10 This reinforces the importance of variable bundling; if a variable is only used for display and does not affect logic, the tool may choose to simplify the pre-rendering or alert the author to the potential for excessive page growth.21

### **The Internal Hyperlink Mapping System**

Each choice in a story passage must be transformed into an HTML anchor link. In a web environment, these choices might trigger a JavaScript function like goToScene('woods').1 In the MOBI export, this is replaced by an internal link: \<a href="\#scene\_woods\_state\_hash"\>Explore the woods\</a\>.17

The Node.js tool must maintain a global registry of state IDs to ensure that links correctly point to the intended pre-rendered sections. The resulting HTML file will contain thousands of these sections, each identified by a unique name or ID attribute.7

## **Optimizing for the Gamebook Experience on Kindle**

Translating a digital game to an eBook format introduces unique aesthetic and navigational challenges. Unlike a web browser, where only the current scene is visible, a Kindle reader can flip through pages, potentially encountering spoilers.16

### **The Antibandwidth Problem in Page Layout**

To prevent players from accidentally "peeking" at the results of their choices on adjacent pages, the static sections should not be laid out in the order they were generated. This is a classic graph layout problem known as the **antibandwidth problem**.32 The objective is to find a labeling of the graph's vertices (pages) that maximizes the minimum distance between any two connected nodes.32

Mathematically, given a graph ![][image12], we seek a bijection ![][image13] that maximizes the value of:

![][image14]  
This ensures that the result of a choice is located many "virtual pages" away from the choice itself, forcing the reader to use the hyperlinks for navigation and preserving the mystery of the narrative.32 While this problem is NP-hard, the Node.js tool can implement a heuristic or a randomized shuffling algorithm to achieve a satisfactory distribution of sections.32

### **Formatting and User Interface Adjustments**

The MOBI format's limited support for CSS requires a simplification of the IF-SCRIPT visual experience. The "Cinematic" mode, which relies on backgrounds and timed shots, is largely incompatible with the static nature of e-ink.1 Instead, the tool should default to a "Literary" presentation.1

| UI Element | IF-SCRIPT Web Implementation | MOBI Adaptation |
| :---- | :---- | :---- |
| **Status Bar** | Dynamic overlay updating via JS. | Pre-rendered text at the top of each section. |
| **Choice Buttons** | CSS-styled \<button\> elements. | Simple hyperlinked text or styled \<div\> blocks.35 |
| **Images** | High-resolution background shots. | Inline grayscale images optimized for Kindle (max 127KB).11 |
| **Typography** | Google Fonts or custom web fonts. | System fonts with relative sizing (%) for reflowable text.7 |

7

## **The Conversion Pipeline: From Node.js to Final MOBI**

The final output of the Node.js tool is typically a large, self-contained HTML file (or a set of files) along with the necessary metadata files for eBook compilation.38

### **Generating the eBook Manifest**

To be recognized as a Kindle book, the content must be packaged with an Open Packaging Format (OPF) file and a Navigation Control XML (NCX) file.7

1. **OPF File**: This manifest lists all HTML sections, images, and metadata (title, author, unique identifier). It also defines the "Guide" or "Landmarks" section, which tells the Kindle where to start the book and where the Table of Contents (TOC) is located.2  
2. **NCX File**: This provides the hierarchical navigation used by the Kindle's "Go To" menu. For a gamebook, the NCX should typically only point to major milestones or the "Start" page to avoid overwhelming the user with thousands of individual states.7

### **Automated Conversion with KindleGen and Calibre**

While the Node.js tool can generate the raw HTML and manifest files, the actual creation of the MOBI binary is best handled by established conversion utilities. Amazon’s KindleGen is the official tool for this purpose, though it has been superseded by Kindle Previewer in modern workflows.14 Alternatively, the open-source Calibre suite provides the ebook-convert command-line utility, which is highly scriptable.38

The Node.js tool can integrate these utilities using the child\_process module:

JavaScript

const { exec } \= require('child\_process');  
exec('ebook-convert story.html story.mobi \--output-profile kindle \--mobi-file-type both', (error, stdout, stderr) \=\> {  
    if (error) {  
        console.error(\`Conversion error: ${error}\`);  
        return;  
    }  
    console.log('MOBI file generated successfully.');  
});

Using the \--mobi-file-type both flag is recommended, as it generates a hybrid file containing both MOBI7 and KF8 versions, ensuring compatibility across all Kindle generations.7

## **Managing Scale and Performance on E-Ink Devices**

As the narrative complexity increases, developers must consider the physical and technical limits of the hardware. A gamebook with 30,000 links is a massive file that may challenge the memory and processing power of older Kindle devices.2

### **Link Density and Navigation Lag**

High link density can lead to "ghosting" on e-ink screens, where remnants of the previous page remain visible after a refresh.16 Furthermore, the Kindle's software must index every internal link during the initial loading of the book. Research suggests that dividing the content into smaller HTML files—rather than one monolithic file—can improve navigation performance.13 However, in a MOBI7 file, all content is ultimately packed into a single linear stream, meaning the primary optimization must happen at the logic level.13

### **State Space Auditing as a Preventative Measure**

To assist authors, the IF-SCRIPT Node.js tool should implement a "State Space Audit" feature as part of its diagnostic suite.1 This audit should:

1. Estimate the total number of pre-rendered pages based on the current logic.6  
2. Calculate the total number of required internal hyperlinks.2  
3. Identify "hotspots" in the narrative where a single passage's variable dependencies cause a local state explosion.21  
4. Suggest re-merging or bottlenecking strategies to keep the file within the 32,000-link limit.21

For example, a "Sorting Hat" structure, which branches heavily in the beginning and then settles into several linear paths, is highly efficient for MOBI.31 Conversely, a "Time Cave" structure, which branches at every node without re-merging, is likely to exceed format limits very quickly.31

## **Advanced Workarounds for Dynamic Features**

Certain IF-SCRIPT features do not have a direct static equivalent and require creative engineering to simulate in an eBook format.

### **Simulating Inventories and Arrays**

If an author uses the inventory.push() method in IF-SCRIPT, the static version must represent every possible combination of items the player could have.1 To mitigate this, authors can be encouraged to use "cumulative" inventories where items are always acquired in a specific order, or "mutually exclusive" items where the player can only carry one of several options. This significantly reduces the permutation count.21

If a more complex inventory is required, the pre-rendering engine can use a "bitmask" approach to track states, but authors must be cautioned that for ![][image15] independent items, the state space multiplier is ![][image16].6

### **Discretizing Time and Timers**

IF-SCRIPT's timers are inherently dynamic.1 In a Kindle book, a "timer" can be simulated using a "move counter" variable. Every time a player navigates to a new section, the moves\_left variable is decremented. The pre-rendering engine treats this move counter as a state-tracking variable, generating "Time's Up" outcomes when the counter reaches zero.31

While this lacks the real-time pressure of a digital progress ribbon, it maintains the narrative tension of a time-limited task within the static constraints of the eBook format.21

## **Conclusion and Strategic Recommendations**

The transformation of dynamic IF-SCRIPT narratives into static Kindle MOBI files is a complex engineering task that relies on the principles of state space flattening and pre-rendering. By leveraging Node.js for exhaustive state discovery and using established graph theory to optimize page layout, developers can create interactive experiences that push the boundaries of the legacy eBook medium.

### **Technical Recommendations for the Node.js Toolset**

To achieve a robust MOBI export functionality, the following technical requirements should be prioritized:

* **Permutation Engine**: Implement an iteration logic that automatically identifies variable domains and generates pre-rendered page variants for every meaningful state.23  
* **State-Equivalent Hashing**: Use a consistent hashing mechanism to ensure that identical game states always point to the same static anchor, preventing redundant link generation.3  
* **Kindle-Optimized HTML**: Strip the HTML output of unsupported tags, attributes, and complex CSS that could break the legacy MOBI7 renderer.7  
* **Shuffled Layout**: Incorporate an antibandwidth-based shuffling algorithm for page sequencing to ensure a satisfying non-linear reading experience.32  
* **Format Lifecycle Awareness**: While focusing on MOBI, the tool should remain flexible enough to target EPUB and KF8, providing a pathway for authors to publish on modern KDP platforms while maintaining support for legacy side-loading.14

Ultimately, the success of a Kindle-based interactive fiction project depends on the author's ability to balance narrative depth with technical pragmatism. By providing sophisticated diagnostics and an efficient pre-rendering pipeline, the IF-SCRIPT Node.js tool can empower writers to reach a vast audience of Kindle readers with immersive, choice-driven stories that function flawlessly on static e-ink hardware.1

#### **Works cited**

1. README.md  
2. MobileRead Wiki \- MOBI, accessed on February 27, 2026, [https://wiki.mobileread.com/wiki/MOBI](https://wiki.mobileread.com/wiki/MOBI)  
3. Working with puzzle design through state space visualization \- Game Developer, accessed on February 27, 2026, [https://www.gamedeveloper.com/design/working-with-puzzle-design-through-state-space-visualization](https://www.gamedeveloper.com/design/working-with-puzzle-design-through-state-space-visualization)  
4. Hyperstate Space Graphs for Automated Game Analysis \- SciSpace, accessed on February 27, 2026, [https://scispace.com/pdf/hyperstate-space-graphs-for-automated-game-analysis-42d18ah8sy.pdf](https://scispace.com/pdf/hyperstate-space-graphs-for-automated-game-analysis-42d18ah8sy.pdf)  
5. How to program an interactive novel? : r/gamedev \- Reddit, accessed on February 27, 2026, [https://www.reddit.com/r/gamedev/comments/423iby/how\_to\_program\_an\_interactive\_novel/](https://www.reddit.com/r/gamedev/comments/423iby/how_to_program_an_interactive_novel/)  
6. Rule-Based Interactive Fiction (Full Presentation), accessed on February 27, 2026, [https://www.cs.cmu.edu/\~cmartens/if.pdf](https://www.cs.cmu.edu/~cmartens/if.pdf)  
7. Suggestions for Kindle Format 8 \- FlightDeck, accessed on February 27, 2026, [https://ebookflightdeck.com/handbook/kf8](https://ebookflightdeck.com/handbook/kf8)  
8. Next.js Rendering Strategies and how they affect core web vitals \- This Dot Labs, accessed on February 27, 2026, [https://www.thisdot.co/blog/next-js-rendering-strategies-and-how-they-affect-core-web-vitals](https://www.thisdot.co/blog/next-js-rendering-strategies-and-how-they-affect-core-web-vitals)  
9. Graph API overview \- Docs by LangChain, accessed on February 27, 2026, [https://docs.langchain.com/oss/python/langgraph/graph-api](https://docs.langchain.com/oss/python/langgraph/graph-api)  
10. Pre-Rendering and Data Fetching Strategies in Next.js \- Telerik.com, accessed on February 27, 2026, [https://www.telerik.com/blogs/pre-rendering-data-fetching-strategies-next-js](https://www.telerik.com/blogs/pre-rendering-data-fetching-strategies-next-js)  
11. Unpacking the .Mobi File: Your Guide to Amazon's Ebook Legacy \- Oreate AI Blog, accessed on February 27, 2026, [https://www.oreateai.com/blog/unpacking-the-mobi-file-your-guide-to-amazons-ebook-legacy/e056c8e2bc274f64fb5ddde65d3b706e](https://www.oreateai.com/blog/unpacking-the-mobi-file-your-guide-to-amazons-ebook-legacy/e056c8e2bc274f64fb5ddde65d3b706e)  
12. Tables in Kindle Fire vs. Kindle \- KDP Community, accessed on February 27, 2026, [https://www.kdpcommunity.com/s/question/0D5f400000FHsM2CAL/tables-in-kindle-fire-vs-kindle?language=pt\_BR](https://www.kdpcommunity.com/s/question/0D5f400000FHsM2CAL/tables-in-kindle-fire-vs-kindle?language=pt_BR)  
13. KF8 file size allowed in KDP, accessed on February 27, 2026, [https://www.kdpcommunity.com/s/question/0D5f400000FHNTjCAP/kf8-file-size-allowed-in-kdp?language=en\_US](https://www.kdpcommunity.com/s/question/0D5f400000FHNTjCAP/kf8-file-size-allowed-in-kdp?language=en_US)  
14. MOBI Support for eBooks Frequently Asked Questions \- Kindle Direct Publishing, accessed on February 27, 2026, [https://kdp.amazon.com/help/topic/GULSQMHU5MNH4EZM](https://kdp.amazon.com/help/topic/GULSQMHU5MNH4EZM)  
15. Browser speed on new Kindle \- Reddit, accessed on February 27, 2026, [https://www.reddit.com/r/kindle/comments/1gb5pqh/browser\_speed\_on\_new\_kindle/](https://www.reddit.com/r/kindle/comments/1gb5pqh/browser_speed_on_new_kindle/)  
16. One month with my Kindle and I'm still amazed by e-ink technology \- Reddit, accessed on February 27, 2026, [https://www.reddit.com/r/kindle/comments/1f3wwoj/one\_month\_with\_my\_kindle\_and\_im\_still\_amazed\_by/](https://www.reddit.com/r/kindle/comments/1f3wwoj/one_month_with_my_kindle_and_im_still_amazed_by/)  
17. Problems with internal links/anchors in MOBI output from Kindlegen \- Stack Overflow, accessed on February 27, 2026, [https://stackoverflow.com/questions/9186437/problems-with-internal-links-anchors-in-mobi-output-from-kindlegen](https://stackoverflow.com/questions/9186437/problems-with-internal-links-anchors-in-mobi-output-from-kindlegen)  
18. Algorithm to traverse graph with certain dependency/constraint \- Stack Overflow, accessed on February 27, 2026, [https://stackoverflow.com/questions/72792764/algorithm-to-traverse-graph-with-certain-dependency-constraint](https://stackoverflow.com/questions/72792764/algorithm-to-traverse-graph-with-certain-dependency-constraint)  
19. (PDF) Zoea Research Note 25: Defusing the Combinatorial Explosion \- ResearchGate, accessed on February 27, 2026, [https://www.researchgate.net/publication/369141533\_Zoea\_Research\_Note\_25\_Defusing\_the\_Combinatorial\_Explosion](https://www.researchgate.net/publication/369141533_Zoea_Research_Note_25_Defusing_the_Combinatorial_Explosion)  
20. The State Explosion Problem, accessed on February 27, 2026, [https://www.cs.vsb.cz/kot/download/Texts/StateSpace.pdf](https://www.cs.vsb.cz/kot/download/Texts/StateSpace.pdf)  
21. interactive-fiction | Skills Marketp... \- LobeHub, accessed on February 27, 2026, [https://lobehub.com/it/skills/jwynia-agent-skills-interactive-fiction](https://lobehub.com/it/skills/jwynia-agent-skills-interactive-fiction)  
22. State Space Models For Sequence Modeling | by Atufa Shireen \- Medium, accessed on February 27, 2026, [https://atufashireen.medium.com/state-space-models-for-sequence-modeling-a95f47f1265d](https://atufashireen.medium.com/state-space-models-for-sequence-modeling-a95f47f1265d)  
23. Elsewise: Authoring AI-Based Interactive Narrative with Possibility Space Visualization, accessed on February 27, 2026, [https://arxiv.org/html/2601.15295](https://arxiv.org/html/2601.15295)  
24. Practical guide to use the Microsoft Graph-API \- DEV Community, accessed on February 27, 2026, [https://dev.to/davelosert/practical-guide-to-use-the-microsoft-graph-api-4ahn](https://dev.to/davelosert/practical-guide-to-use-the-microsoft-graph-api-4ahn)  
25. SSR Deep Dive for React Developers, accessed on February 27, 2026, [https://www.developerway.com/posts/ssr-deep-dive-for-react-developers](https://www.developerway.com/posts/ssr-deep-dive-for-react-developers)  
26. Five common ebook conversion challenges and how to solve them \- Apex CoVantage, accessed on February 27, 2026, [https://www.apexcovantage.com/resources/blog/five-ebook-conversion-challenges](https://www.apexcovantage.com/resources/blog/five-ebook-conversion-challenges)  
27. Anchor text \- Wikipedia, accessed on February 27, 2026, [https://en.wikipedia.org/wiki/Anchor\_text](https://en.wikipedia.org/wiki/Anchor_text)  
28. Hyperlink Guidelines \- Amazon Kindle Direct Publishing, accessed on February 27, 2026, [https://kdp.amazon.com/en\_US/help/topic/GQ6JQ7FM6C72HE4X](https://kdp.amazon.com/en_US/help/topic/GQ6JQ7FM6C72HE4X)  
29. Hyperlink Best Practices \- Towson University, accessed on February 27, 2026, [https://www.towson.edu/web-guidelines-resources/content-standards-best-practices/writing/hyperlinks.html](https://www.towson.edu/web-guidelines-resources/content-standards-best-practices/writing/hyperlinks.html)  
30. US20050149851A1 \- Generating hyperlinks and anchor text in HTML and non-HTML documents \- Google Patents, accessed on February 27, 2026, [https://patents.google.com/patent/US20050149851A1/en](https://patents.google.com/patent/US20050149851A1/en)  
31. Standard Patterns in Choice-Based Games | These Heterogenous Tasks \- WordPress.com, accessed on February 27, 2026, [https://heterogenoustasks.wordpress.com/2015/01/26/standard-patterns-in-choice-based-games/](https://heterogenoustasks.wordpress.com/2015/01/26/standard-patterns-in-choice-based-games/)  
32. graph algorithms \- Laying out pages for a “choose your own ..., accessed on February 27, 2026, [https://cstheory.stackexchange.com/questions/55559/laying-out-pages-for-a-choose-your-own-adventure-book](https://cstheory.stackexchange.com/questions/55559/laying-out-pages-for-a-choose-your-own-adventure-book)  
33. Force-Directed Drawing Algorithms \- Brown University, accessed on February 27, 2026, [https://cs.brown.edu/people/rtamassi/gdhandbook/chapters/force-directed.pdf](https://cs.brown.edu/people/rtamassi/gdhandbook/chapters/force-directed.pdf)  
34. Force-directed graph drawing \- Wikipedia, accessed on February 27, 2026, [https://en.wikipedia.org/wiki/Force-directed\_graph\_drawing](https://en.wikipedia.org/wiki/Force-directed_graph_drawing)  
35. Need help converting gamebook to Kindle \- Choice of Games Forum, accessed on February 27, 2026, [https://forum.choiceofgames.com/t/need-help-converting-gamebook-to-kindle/82824](https://forum.choiceofgames.com/t/need-help-converting-gamebook-to-kindle/82824)  
36. Tutorial: Saving Multiple Images to Target File Size for Kindle MOBI \- Clamour Creative Inc., accessed on February 27, 2026, [https://clamourcreative.com/tutorial-saving-multiple-images-to-target-file-size-for-kindle-mobi/](https://clamourcreative.com/tutorial-saving-multiple-images-to-target-file-size-for-kindle-mobi/)  
37. Ebook Best Practices Every Author Must Know Before Publishing in 2025 \- Designrr, accessed on February 27, 2026, [https://designrr.io/ebook-best-practices/](https://designrr.io/ebook-best-practices/)  
38. How to Convert EPUB to MOBI \[But You Might Not Need To\] \- Kindlepreneur, accessed on February 27, 2026, [https://kindlepreneur.com/how-to-convert-epub-to-mobi/](https://kindlepreneur.com/how-to-convert-epub-to-mobi/)  
39. Four Different ways to Convert EPub to MOBI or AZW \- Managed Outsource Solutions, accessed on February 27, 2026, [https://www.managedoutsource.com/blog/four-different-ways-to-convert-epub-to-mobi-or-azw/](https://www.managedoutsource.com/blog/four-different-ways-to-convert-epub-to-mobi-or-azw/)  
40. E-book conversion — calibre 9.4.0 documentation, accessed on February 27, 2026, [https://manual.calibre-ebook.com/conversion.html](https://manual.calibre-ebook.com/conversion.html)  
41. ebook-convert — calibre 9.3.1 documentation, accessed on February 27, 2026, [https://manual.calibre-ebook.com/generated/en/ebook-convert.html](https://manual.calibre-ebook.com/generated/en/ebook-convert.html)  
42. I cannot figure out how to convert in this way : r/Calibre \- Reddit, accessed on February 27, 2026, [https://www.reddit.com/r/Calibre/comments/1iil40u/i\_cannot\_figure\_out\_how\_to\_convert\_in\_this\_way/](https://www.reddit.com/r/Calibre/comments/1iil40u/i_cannot_figure_out_how_to_convert_in_this_way/)  
43. Specify different HTML for KF8 and Mobi7? \- KDP Community, accessed on February 27, 2026, [https://www.kdpcommunity.com/s/question/0D5f400000FHmfhCAD/specify-different-html-for-kf8-and-mobi7?language=it](https://www.kdpcommunity.com/s/question/0D5f400000FHmfhCAD/specify-different-html-for-kf8-and-mobi7?language=it)  
44. KDP's MOBI Phase-Out: What You Need to Know \- WRITE | PUBLISH | SELL, accessed on February 27, 2026, [https://writepublishsell.com/kdps-mobi-phase-out-what-you-need-to-know/](https://writepublishsell.com/kdps-mobi-phase-out-what-you-need-to-know/)

[image1]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADUAAAAXCAYAAACrggdNAAAB6ElEQVR4Xu2WTStFURSGlzAQIiSKZGpCKcrIgIGSAYpfQBlSlH/AwMBIDGRggkzMJN0xAxMjKR+ZMJFCIR/ve9fZ9+yz3W91rlvnqad7ztrnY++71177iERILWyGpW5DsVIDj+EifILDwebi5AgueMdb8Ntq+7cwpc5FO3sP24PNAV7goRsMmQ74KdrfDactDlNrFy7BNfgK3+GMfRHog1NwHzY5bWEyJzqgHtgCL+Fo4ArwBped2Jfov9DoxMkOfHSDIVEB92CZE/+Aq3aAnaecMcOpFxuwYoZp0Ta+IGxYfZMN6kZ0rSe4Eu1kuRXb9mKz3jmPu71jFgyeV3nnYdIg+m4uD9PfEtF0HDQXERaJajsgv2fqWvyHMP2YnoXCZNaJaMGYgPOig0sJO8+bOHqbfjgOK514KurF70C2ciYywbRfEf8eFoqMjIhezCrzV7gGcjEbWPG4bz6IPzDOVMovHX41MF/TTmUBaYMX3q/hTHRgd1YswTrsss5ZYQKLLw/cmchkOpj2nKFOtwEciA4sANeRm5vM7yEnlgv5rKm6+J3JYbWNSfLBm20mwZhoUbh1fJbkDygkk3BTgtsPYSWM2QF+Hbj/mLEQe1E6TGW2N1oWDo6Bn01FTatoDaC9TltEREREen4A80x+Qar7Vt8AAAAASUVORK5CYII=>

[image2]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAA0AAAAZCAYAAADqrKTxAAAA00lEQVR4XmNgGDnAGoj/A/E7IP4LxL+AWAiItyMrQgaMDBCFilA+KxCnAvFzBohBGEAWiG8zIDQgg7dAfABdEARyGCCmgWxDBw+BuBVdEAQOMEA0iaOJg8BaIJZHFwSBPQwQTacYIH4hCvAzIDQi405kRdgANxA/ZcDUSBK4ywDRJIkuoQTEN9AFoaCcAaJJEF3ChQES+9jAJAYcztvKAJFADzEQHyRejCYOBk8YIElnGhALQ8X4gHghEPcwYBoGBs5QGhRyvkA8C4jdGHAoHgV0BwAy4y0Lbz1ufAAAAABJRU5ErkJggg==>

[image3]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAA8AAAAaCAYAAABozQZiAAAAuUlEQVR4XmNgGAUUATUgngTE94H4PxBvB+JZULwBiH8B8Ucg9oRpwAb2MEA0y6CJC0HF36OJo4B/DBBF2ABIHIR50CVgACQJMgAbgGlmQZcAAWkGiORWdAkgMGaAyB1Cl4ABFwaIgnI0cX4GSFjcBWJNNDkw4GCA2AhzGjI+DsTeCKWYAOTkB0B8GIiVgVgSCRMEIKeCbPFDlyAGwJyM1U+EAL74JQhggUM0EGPADFkQPoCkZhSMYAAAKTUw9OrT38sAAAAASUVORK5CYII=>

[image4]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAYCAYAAADzoH0MAAAAy0lEQVR4Xu2SPRIBQRBGWyBQQikHcgYHIBU4gQvIKBmZWMlEXIFQQLmGn+/VzFbNtlqsUO2resF0t+7tGWYVGSd5cXZyFWazJIf7NDmXS/mQh3hupAViZOFH1KzkMJ8OkOz7YKQmJ7LlEyk0WPhgZCenPui5y61sujjTj7Lt4i+c5dXyhdzFWtaTWCFMZ41uEqPhIDm/hf1p0ItnpjLdv0ghvEB2kazB3uz/NXw6DTYWbpybLwVTaXCTYys5HXi+rMHP0ODjH6bir3gCHhAsdytz4mwAAAAASUVORK5CYII=>

[image5]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAZCAYAAAArK+5dAAABSElEQVR4Xu2TsUoDQRRFn6igTUCsRLGySDorQbBMJ+kEA4IfoZB8QZqUCTZi4zeIRL/AQJqUwUYJWoUUlirG3Mu8zU4ebJwsES1y4MDu3N2Z2fd2ROb8N/ZgB3YTbMOd0dMp2IZV+AS/YQNeqtfwVccvohfS8gJv4YoNwDEcwKINpoETlO2gsgZb8A6umiwI7ppl2LSBB8v1CQ9sEAIn5gJLNvDgAnymYIMQWBruLoktcT3qw5zJfoTlYXOfzbhPXlyP2Af2Yyqil5MaTJriyrNvgxC4+0kN5l/D/NEGobC2SQ1egCX4IePNXYbnsKL3u/Awjsfh5CyRZV1c1rMBuBL3Ze96zwVrcex2dgRPxU3ypveR9/AL1mFG3/HJiluAvYk48a5nwpnEh479S3XCJ8GDt6HXM9894eF7gDd6/SvwR1i0g3P+niH1fkAxJCElUgAAAABJRU5ErkJggg==>

[image6]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAmwAAAAzCAYAAAAq0lQuAAAEI0lEQVR4Xu3dT8hlcxgH8J+YohQa+V+vhUQR0pCynJTEwkxRljazkEJRVjYWshE7qYn1YGExiqUyNQtSUpOFWUiRppQNid/TuWfuuc+ce373Pe8dzVufTz2973mec+/Zfjv3nN+vFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAANi6G2v9O7M+L+PyeZvWh/FhAAAu1AemnTxY42Cts6X7zGVpNnSmTAexJ0s3/ycPAABYFaGrD20PpdmUa2qdys2BPpC1Atu6OQDAvvJWWYaq8PFgtg23l+X3H1gdTTqWGwOtQNaah5trPZh6R0fq7pUzxr2WGwAA23Kk1k2D4wg5hwfH29IHtnN5MFMrkLXmYSywhfjcrYv/4w7hJ7XeOD8dJ7ABABfF9WV5V613Oh1vUx/aIiTuVSuQteYhwtpYYPs7N0o7yE5dBwBgtggrObAdSsfbdFtZhrar0my3WoGsNQ9jgS1+/jyReiG+683cHJi6DgDAnpwsyxCVw9vQ8Jyx2lQEtd1+ZkwrkLXmYSywxR3GWI4ki+96OjcHpq4DALAVfcAZCyvbFkttxLWeyYNdaAWy1jyMBbZ1QTL6V+bmwNR1AABmuzodx4Pz16VeLx7Qn6rd+qNMr7PW0gpkrXnIge2+Mh7YPqv1QG4mU9cBAJgl7qTFSwdDv6Xji+XVWu/n5i61AllrHnJgO14ufOHghbK6+O4rpXuW7f5aTwz6U9cBAJglHqx/u3Sh5tdaP5a93fHaVCyeu5ObM7QCWWsehoEtzs313WI2FM/g9Qv6PjfoT10HAGDfiN0L/srNmVqBrDUP+Q7bJl6u9Wjp1mkbvuk6dR0AgH1hzs+g7+TGQCuQteZhTmCLpUm+XvwdmroOAMC+8GVuNNxR6/vcHGgFstY8zAls60xdBwDgkncmNxoOli5sPZIHA61A1pqH+Elzrwv49jbZbxQA4JKUH+TftH6JD4+IJUReL6vn3lOWS5TEWmkvpvlHta5dzAEAGIi7V0dn1k4ZF8/BjdXji3kst5FnUc8v5gAAAAAAAAAAADDmm1rPlu7FgtgOKhbanSMWtY2XDWJv0BDf816tA+fPAABg0rel28s0i5DVO1268LaJT2tdnnpny3JT+nhLFACANe6q9VOth2s9VabXPesXyo09TccW2j1S6+fF//2G7McWf7P4fGwhdUPpFuEFAGCN46W7m3a41gelW9B2uHzHvYvzrlic0xLfF15a/D1ZVr+v/9kz9vx8t3RBEQCACX8u/p4q3bNk6+6wxd2wWPS2pd9KKvYmDevusB2q9XtuAgBwoXO1TtS6c9D7qtYtg+N4Bq3flaDlh1pfpF5sP5VfKIi7ev3dOAAA1ohn0R7LTQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgP/Dfxi0AeO7kqy0AAAAAElFTkSuQmCC>

[image7]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABMAAAAaCAYAAABVX2cEAAABK0lEQVR4XmNgGAWDAswC4jVA/B+KQXw/FBUMDMuB+BcQ/wXifUAsiSqNCgQZIAY9R5eAAkYgXgrEKugSuADMZdjAZiCeji6ID+Az7DYQK6AL4gO4DJsAxDzogoTAVwaIYRxo4s/Q+ESBuwwQw5BjqhiIxZD4RIMDDBDD9KF8bSB+BJclEcxhgBjmC+U/ZYAYSBYoZ4AYBqJlGCBeJBu4APE/IH4FxegA5EoNBkjCzgNiZiB+zYCZW8DAmAERo6DkgA4KgdgUiL8xQHIECDxkgAQPBuAF4sNAHI4ugQTmM0BiHQZAPsFqGAsDxPms6BJI4DQDpFCAAZAvIpD4JAGQ5k4GiDfLgNgEVZp4ADLgPQMkPW4E4kMosiQCUASBkg3FAOSqfCB2Q5cYYQAAkFY7EF3iZhwAAAAASUVORK5CYII=>

[image8]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAZCAYAAAAIcL+IAAAAtElEQVR4XmNgGAUDAtyA+AIQ2wExIxBnQfkgmhOmiAWIc6Ds/1AMUgwCU6B8MFAEYk0g5oAKzodJAEE5VAwkBwcuQPwciJWQxNYwQBTywgRA1oMEW2ECUPCbAclqEBAH4rtA7IksyABR9BpZoAgqqIMkFg7Ee4CYH0kM7pZZQMzKAHHveyCWQVYEAt+A+C0DRBHIGSi+RAYg006jC6IDEQaIwmh0CXTwigGi8B0Q+6HJDSkAAHAxIopbvvFOAAAAAElFTkSuQmCC>

[image9]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAB8AAAAZCAYAAADJ9/UkAAABoklEQVR4Xu2UvytGURjHv8Ig5XckScwGPzKxkc2k5B+QRUkGf4FBmYRBSkbFIEnJ8GZksREZFJkwMZAf32/Pud1zz30Xr/fF8H7q073nObf7POe55x6gSBGjn37SR/pOX2kdPfAfKgQlsITtblxOJ+g9rKCC0UqvECf2eaCZMJhPpmCr0+pDbuh8GMwnGVjypiAudmhbGMwnR7DkJ7Bv/atUIy7Ad8F/qJBU0jukC/gTrmHJm8OJb7IBe1eKDnoRBh1zsOS14cQ3eYa9K8UQ7DTLxhKyt32WntEVN9bveU5X6ZibG3XxNdg7DmGnZ4J92GS4wzVWXIkiuukT4rNggI7TGdpHX7w5nQ3rsK5t0zIXT3ALO1JVdb2LVdFNuohkUXuw5BHqmtrZQyfpmzenI1l/T697JiuD7qqdPgJr0zDSnRDqhH/SaUWd7v7UjSP0rLqizdbixXPmA8lV+J/A31Q6M47dVUWp5TIqNCe6YH+GPsklrXBxFaBCMnQXljhimW4h3pw/opQ2umtEA6zl+lQ1XlyosDCWN/Tyadg+KfK/+QJohFfcfqUtbgAAAABJRU5ErkJggg==>

[image10]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAmwAAAA0CAYAAAA312SWAAAEVElEQVR4Xu3dO6hcRRgH8AkqGHwlKooQuPFViGAUjYUvLFJooYUPFLQQLKxVSARLCVhYCHZiYyEWikEkaCEkWEksTKEIgnC1EQSxExR8zOc5x52dnD13d++euxf9/eBjz/lmdy/c6s/MnpmUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAYEdcneuvJeuTNNv36dz3z1PxOQAAKl1Y2qgHZrgiTT4z5II0ed811VinDHYAAMxwb5qEpj3V2JBP60aPLpBtFdjMrAEAu859aRKS9ub6eHp4xx1My810fVg3KqsKbMfqRvZYTx0s3zDD2boBAFC7LNczxf1vuU4W9+vSBbbb6oFtGDOwhfjsxe31ebnOpOn/bR+BDQDYUj2L9VSu66reunSh7dF6YEmrCmxv143solw/1s3UfN9NdbPwQ90AAKhFoIjZoM5Gcb1uB9JyS6OzjBnYjuQ6XjdT830RgmcR2ACALT2SJqEoas/08NLK7+yreX2Umvd/Uw8sYczAFrNrMctWi+87XDcLAhsAMLebc/2e64V6YBf4IzXB54l6YEFjBra+EBrht69fEtgAgEEPVfcRZIaW72pD743vGqpFRWjb7uzfWIHtwdQfzL5KzbLuEIENABj0XHX/epqEovhdW5wecHd7fyI14SMCxr5cb+Z6JzWnE4ztaGo2vt2usQLb6XTuAwev5fqluD+V69bU/M6te5I0CGwAwEwRtP7MdUt7/2xqZoQ63fUXqXkQIX6fdUPbO5TrnvZ6bHel+TbFnccYgS32W4vPfNZed/cRMkvx/343NRsDl0+NCmwAwFIi0Oxvr7ulvm75M7b8iL3bNtv7McXfiYciVmWMwDav73Kdn+v5qi+wAQBLiWXRmBGKZdE72t7X7Wv3tOavud5or8fQnf25iKvqRmWdgW2zfa1/NyiwAQArEQFus26ObNFl0FiuvbJuVtYZ2GYR2ACAlYhQsZPB4tu6sYWY6ZtnNm5VgW3o5IJF3V83AAB2uwhMy1T9lGYplkq/TNPvfyBNnoiN8ViqLMcfb/sAABT2psmTlnU92dMrayPN9mpqtiGp68ItxqMPAAAAAAAAAAAAfcrfmz1djS3ipdR8R5z2EK5v7+MoKQAAtuGtXEfa6zgRIU4SWNbP1f0qzi4FAPhPipMULs91NjXbbtyZJmeY1mL7jc6Z4roUZ6GG99rXk2mynUfp/eK6ey8AAD0O53olNZvbxgza0PFXEdhiQ9/NXJdOD/3j5dQEwJh522x71/47Ou1Y+xpLq32BDgCAVsyIRcA6npq914YC28N1o0c3cxYb5YZZge321Ozn1i2F7ivGAAAoxKxZzHD91N4fSv1LohGwLqmbPSL4lTNmH1T3nTiH9MXiPpZib0zTS6UAAKTJ0uS6nW5fD5RNAID/uxNpZw+ZH3Iq1/66CQDA7vF53QAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIAF/A2gdh7N5DZE0wAAAABJRU5ErkJggg==>

[image11]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAG4AAAAZCAYAAADQfBuCAAAEr0lEQVR4Xu2ZS6hOURSAl1Dk/cgjyrOECQnJoztADFAYKEMDkhFFUfoNDJQkKZGSgTySESUM/lLyGkiJRCFlIAaKQh7rs8/y77vuPv/9z++/3Kvz1er+Z619ztl7rb3XXvtckZKSkpKSJhmgclzlgcoIZyvpOkZJ8Dm+JwaF+JZJL2/4T9gpYXwvVZ46WyPMU3mi8kPlokqf9uaWgO8tDg1Dh256pWOYSm+v7CF8VzkqwSmMtSiTVY5IuHeXs7USYlCofzaT8hgpoc1ub+gBLFL5pDJX5bbKtvbmQuCDcV7ZQm5IE4E77ZURDJ5Zu9QbegDbVZ6rjPaGgvST4KeuSJMGMWhZ4Ogoq7GrcntXQnq/JyHN/SlM2q9e2WIscAO9IQWN8gK3XuWUyluV+yonVDZktv4SZvLl7Hpsdk2ejoucA5l+RqSDwSrTnA76qiyXUAxw3/j25oZZo3JG5bOEvhO8lRL67aGaI03xPvrF1uD38/0qj5zOYLznVF5lf1PMVzkk9du0LHDAZoydwcQwiEESAsWmv05C9UbbVRJW50kJgcD5pgf2iRcqm7Nr46CEFRIH67WEdNcMPJ/35gXfKrm40rwqHbcFipM30rG/sEVCe8CXZ6V9AWPvmBXp8Bu+8RQKHDOBxraSPFckndtZiTagwxI6WJXQdkEmrBpYrfJRZU52jVMYrF0D93PvzEgH7yS/b52Bc+o5grHj1GWRDqczJsZmsFJ5Ttxfg4nG2AA7vzfVzL8mtC/x2W8rTgdrJfiFfuXCSvmicskbHDyIqiwF6YMBsZfkMUnCqomrOZsMcUq1cpt0jLyXMGBSV7PwXp6ZgsmAza8iMgnjiqlKx/4atMeGMJnj9G8r3raZ8xL8eSFqk4Lth/vqHtFIT6SKCd4gtUqKDqVgZuY5xqCooQ3PMvxkYH98KWGfaSW8l+ClMIf7SYfOl/zoPjhdzFSVO1ILoI21ml03WtESA2JRkbDF1IXPWzw8VXmRLrDFs3J69BsbqawebPg+uFzjONJvm9QCl7fPNgvvyZu1vA97vIosXeN4HDc806MjJdJf2+tpu0RlYXYNrCTaWmquuuvOqEiBQNuqSjmNfI+D6SwDYbnbTLCiJhXwGHOQYXsqk4G971amr0j6I8AzlR3Zb/ZS7j0mHfdcjxVEPhUaFBFxv2x8pqtIeAeTCt1GCeneqlIKLfTWN7CvM4alY7+qx0h6DIWKE8gLHC+2wO1TuRvZWHnch/PrYQ6ymU0q4BonXJdQlQGOjgdNJtirslVq99qXhUYO1Hw04NzF3xSLJRwVcCIwfkp10vhEqZX+Q6QWOL68GBRf3G/OJ/C8j63HIADXJFTbBoULWSqVCi1wPqC55AUOcCCd9HDOafS/CDgeB07Jruk0jvdnJeCDLpKyGUygOGWnoKJkBXfmBPrBqjJwNuOKUyhZiffFOoOv+9w/1BsieGabdD7ZLHANUy9w3REC58+VBs7B0extzR4j/hVWyDUMjate2U1hNc72ygw7b9lxo6dRlYL9tn2juzNB5bGkUxaQ0h+qrJDWHy3+BqkKvC4ccvmmyE0cysnbJX8HfI3P8f0eaeK/4CUlJSUlv/kJBWImt7q9SdYAAAAASUVORK5CYII=>

[image12]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGAAAAAZCAYAAADOtSsxAAADgUlEQVR4Xu2ZTagOYRTHj1BEyUckyiUpZSMsKBaiKKQQYalILCgf3bK0kpINyQIlhYUF2VixEWVFJPKRWAhRlOTj/Jx5ep8578y8c9875r5qfvXPnXOed+b5OM95zgyRhoaGhoYuOKVa4409yHnVcm8sw3HVJ9Vv1c/kXwY8THVFdbbVtHZuqcZF10tVr53uRn44HfnQHdXkVIty+OfkaVX4gbJZtSG6LmSM6oTYhN+T1kCxf1btSHzbEnvdEABfnW2Z6oJYv9AZ1eFUC5EDYpOOn8DapxqZatGZ4WL3vi52n5vJddA11dvEtzb5DfCc56q+yJbJErEf3/aOBBaDyLqvGu98dTBCdUk1zzsSwgJkwcIRWBO9owvWiT2He2bRr5rlbPT7u7O1QWQQJRO8I+JkoqFgsdggRnlHQtECkKYYXxUw/rznANE/xdlISb/EgqiNEB1Fqxo4pJrrjTXBzvvmjREMkDGQLmMY0yPVdGfvBsb+QawvMUelNXfMkYeJv6ra4h0QIqtMhHDzsd5YE1/EcmkenA0sgE+P88UOwirg7OMZcRYgrXFeBvLmh7nLzB4vxW6auTpdwKEYH05lVAb6SFmXB1FJmwXO/sZdD4bwDC+/I7JYJDkBFLZuValljrRPcJY2RioDfSwqfylPabM6ss1W7YquB0vYZVvF+n0wuS7qV4DAyAyGsIpZB8QrsR/FNe6RVIv6oI9Z+TXQL+k21N7vWu5BQ44PcxXzVNLB+yD6O2aqtJfQfylagABbjMH48qpOOi0AkU+bG2J5mHI6fmEbLKQQ7s9Oy4PzNK9MDgd4Gxi58STviGDleLCvMLLYK61FLasy0K7oDGCL009KadIDpWeV7BTrAxVPFrxwXZb8QKZ/ZJQ2+sQOB7ZSFjPEHrzCO2qGs4rJzYMAotykrw+dr4j3Yr+hWspjmlixkpcFRot9svGfQGKooC56Y2ChWCdoFL+ir1Q9E4ssOjGUMPiinM7uZJcyEfS7LGEX7vcOsUVdrzomFgBPVNslXUCck9Z3M3x5UIJmPSPFJrGGVCm7xb5/9AohBRTBOcBh1w2ZNXpFcC6wSFWeSbUzU6wi86/5VUDeZoH/FXukc/D8F/AJOX7rrAJSLjs+7/Csgh8ygE/Svc5H6fzNaiDwMvXYGyukT2yBB/r5u2dh8l+IFQ69DhPPf2A1NDQ09Bp/ALlB6flaXSYbAAAAAElFTkSuQmCC>

[image13]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAKwAAAAZCAYAAACsNsUeAAAEnUlEQVR4Xu2bTagcRRDHS1SIqGgkRILCgyCCBPQgEgIJeDABET34GUjwkICK3hT04CUmp9xCDoqiBBFRVETQg4iHhx6U4MEEBUkIieIHIioICip+1I/aJjP1ununZ3b3ZTf9gzpM18xOd89/qqtrd0UqlUqlUqlUKgO4UG2z2odqp5xvkVijtt83DuRetT2N4/Vqn6s9r3Zpo70IHsiTau+rfa221Hb3hgn4JmKer6Ttf6TtXlWuVftP7RXvcDCH1/vGOeMytWXX5p8d9k7rDJF3Gz7s9YbvKbWXG8eBC9T+GVkxD6j9q3af2Ac83nb3hgl4Qe0TsYf+5ujY85KYH3tW7ca2e1W5U+0PtVu8w/G22hnfOGfEBMvzekvOPh+OH2qdYVH5CzH/d2q7Gr6UYOFjsWuK+VvsoexQ+1Tt4rZ7MDeJdWydd4zYpLbbN54jINgf1DZ6h9hKwPL2jNj4WJ3mGZ7Pl75RbOlmfAS1GJeIRdmYbg5LWrCkWL0Ey0XTzM02iN2D5TXGG2KDPhdBsAiRMeRYBMEyxtQYQoSNQbD50TeOQKwpwdKe+swka8Uu4k2YFuSy3ON27xDLl5/wjROEyLjFNxZQBWukBEtU/UAsnYjRRbCpa1tcJbbRelXsos/Eco+YqDzXqT3mG8fAPZq5DVyk9pzaFa59knCPA2JJfh/IwapgzwqW+Wxyl1gFJcXEBBt4WO1bSS/XMULnb/OODJzvO35UTEzT5pBYvtSHKliDPJ4xNueBZ8czzDFxwb4otjMsuYiyBQl4SWSkY4gm1N6IeOwsqctNG/rJvUv6C5z/kdprsjKyeBZdsOxxGCMb6MCvatsbxzFygr1bTEe5CN2CqEp0JcpOG+4TIlUQ0DgRxNgmK+uCXS2sDDfIeH4Re0jksF1YdMGG1DHMB+lkl1U5J9jAe2KfTZkrC0LlxC43HgoC5W0ijWBHSe13lvA2Pyhluewdar+r3eMdERZdsNTmGSObc1bjI213kpxgl9ROqO2TeElsBaQDdOJy75gCIV9h40UZq1MHJ8RWtdO+sQOI+6BYbTJVQw4wtp9945yREyyRlTESaR8V23h3ISfYfWKfebVrT8IyzQWl/CR2HQX/roRo3ud+Q1mWshy9Cf0OqUwOxkU0jhHGneoD85ibT1KncXPHbh0/+4IYfMmBP1eCygmWNIoXks/gS4Ku5AQbgliqPyvgGy6slDB5JVUCymWlg50E5Ms7fWMBuTrsNWI/7mDVYGykPBzfKu38PMxXc8PSJMxNaj4ZwzjBhiU7FeXDavqbpPuREyxRkJyeYJV6sWJ0EWznvQwn8z3xLLhShgmnL1QlWNr7khNsCUSRlCBnCRE21Y+cYGGvFETDEV0Em4XckbeFvJWTV0NE88SkBLtRulUnpg2/fUj1Y5xg+5ATbPhRTZawtLBLpyheyYNgyU1v9o4CltSO+cZVgH6Q66aYtWCXpYNg/1Q7LvarrNJC+vnIFrHcdEgZjpJe7GeVsyTUvnPVmVkLNnwZUZkw94v9yJzJ/d75FglSxZO+cSBs9rAA32z+JTaXT8uAfx1UKpVKpVI5L/gfUTY24IR/5ScAAAAASUVORK5CYII=>

[image14]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAmwAAAAsCAYAAADYUuRgAAAEVElEQVR4Xu3dz6ttYxgH8PeGIr/vFYkiSRFJQmRAKBIKg1vuP0AyUX6NlMyMUAxElKSUgUSSdu7klpEiUgYkBqIoSvLjfay1zn7Pc9beZ527z3VO3c+nnva7nr33Pe++o2/vWu9apQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEejR3MjOSk3qq9yY8Q9uXEEHJcb1TO19uZm8kNuVGfXujI3AQBW8WOth3PzMCwLbB/X+iT1Pqi1L/UW+SI3ttELtfbX+jz1D6TjMSeUjXMT2ACAbXd7rTNy8zC8mhu9u2tdUNb/jQf7murWWs/n5jY4udY/uVk2hrBl8twirAlsAMCutCiwvVtrT+r9WcZPkS4S3x8LVqu6udbvqXds2drfynMT2ACASW6r9Vutt2udUutgrXdqXVLrmDIPGBFOfqk168dPlO66rPheiM+d2Y83MxbY7i3dvxGv1zX9v5txiNOSd9Q61B9H4Ll+/vZ/fk3Hq7qh1pe1Pird/Ab3lS5kDq6odWfp/o9CrKh9s/Zup52bwAYATBYB6tp+HGGoXQVqA0dcezZrjtvPReiL704xFtgWrVa1F+vHClWcUoyQ9Fbfe6XW8Wuf6HydjrdDrPTFKlsrfsfTzXGEutCGzFkzDu3cBDYAYLIIHXEBfNhKYIuQ1o6XbSZojQW2i8t4YMsrVCE+d04/bucwmOVGL763qF5sPjcmPnN66sXvyL855tX+jliFa82ascAGAEwWoWOnA9tLtT7MzTIeyH7qXyNAxVxj7qfN3x4NeasaC5Pxe/NviVPKz/bj2BmatXMT2ACAySJ07HRgi1OfeTUqjAWlYU6Ply68vdG8F/J1b9sh32okxLVzuR+hM67vC7OmP2jnJrABALvWWGCLYBbXsWVxz7M4XdqKm9fe1I/blbUQtwT5LvVWdXnZuLFhMBYoY1fr2M7WPDeBDQDYtdrA9l7pdpouClkXlvmO0Clite3S3FzBX2X9xoLsqdxYIs9NYAMAFno5NyaYugN0ijawxa7PsVWq1nllWjDaU+vq3FxRzO2h3EwWhc3WI2Xj3AQ2AGDU2LMwp4p7jG2mvZ9a1NgGgHyKc4pzc2PEXbnxP4mgGKdNl7koN0q3KWFsYwIAcJT7Nje2YLj3WTi11mXN8eCqMt/teWOt55r3AACYYFjxilWha0r3pIOQV73iAvkIXvvK/LRdPOtzWOl6rH/NXi/dw9o/K+MX3gMAsIlZ/7q31vulWyk7a+3duXis0v5+PNwwNlbPIrzFLUAOlPlpz/ZxTfG8zXjyQNxyI8TfAQBgC9pryoZxnOp8sh/Hrsww3GMtVtgGU1bY2kdJnd+MAQCY6Ptm/GmtN0sX1iKMhZ/71wdqvVbr/v44tNewnVg2XmjfPuop6o/1bwMAMMVmu0SX3cLiltwAAODI2On7sAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAOyIfwFzGLsgllTQ9gAAAABJRU5ErkJggg==>

[image15]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAwAAAAZCAYAAAAFbs/PAAAAsklEQVR4XmNgGAVDGgQD8QUgtobyzYF4BVQsFqYIBjiBOALK/g/E/6BiIGAKxN+AWBzKBwNNIJYGYl4GiIZDSHLGQPwViCWRxODAE4gfMEA0w0ArA8QQFiQxMOAA4q1AXIUm/hOI36OJgYEMED8BYhc0cZDpOxggNsACBAxAJoMkQTbBgD4Qv2WA+LEBiJcjyTGsYYBoQAYghQ8ZIB6+BcSGyJJSDBBnoQMBBhwhNAqoCgDZfRux6ZYd3wAAAABJRU5ErkJggg==>

[image16]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABMAAAAXCAYAAADpwXTaAAABHUlEQVR4Xu2TP0uCURTGn8DAEBEaJKjQVXBu6is0uOTQBxAaHAsa0sXBraG9T9EiEpFfoaYQKtoiWtyiP8/Duff1vK8EWmP+4AfvOefe63nvewSW/IU1+kC/6C09TFWBC3pHc3SfjmkntSKwQW9omx7ADpQ1t6ZJj+mANmidvrl6woSeuHiFnsMO7MK6lpe0GNbs0vfwnCJ2knc5LVbuOsRb9DmpAj366uKEF9hGdRTRZuUeQ6zO/WZ11YLd5abLY5UWfAKznekVR0nVDtad9pFuYoZtek+HtBRy67AfjehKyi7+kTNYV5VsYVF2YDPkx+JX6LU0b5EqPXXx3Og+rmB3E9nD9APMzRH9pE8ZP2DztBDaFAc3q/5eS/4d39h5PExovR6rAAAAAElFTkSuQmCC>