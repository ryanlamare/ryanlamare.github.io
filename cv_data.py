# -*- coding: utf-8 -*-
"""SINGLE SOURCE OF TRUTH for the CV and the site's publication lists.

Edit this file, then run:  python3 build_cv.py
That regenerates cv/index.html and the publication blocks inside index.html.
Never edit those generated regions by hand — they will be overwritten.
"""

ME = "J. Ryan Lamare"
UPDATED = "July 2026"

PROFILE = dict(
  name="J. Ryan Lamare",
  role="Professor of Employment Relations and Human Resource Management",
  dept="Department of Management, London School of Economics and Political Science",
  contact="<a href=\"mailto:r.lamare@lse.ac.uk\">r.lamare@lse.ac.uk</a> · <a href=\"https://ryanlamare.com\">ryanlamare.com</a><br><a href=\"https://orcid.org/0000-0003-4935-2341\">ORCID 0000-0003-4935-2341</a> · <a href=\"https://scholar.google.com/citations?user=tLTPGScAAAAJ\">Google Scholar</a> · <a href=\"https://www.linkedin.com/in/ryanlamare\">LinkedIn</a>",
)

# --------------------------------------------------------------- publications
# Each entry renders into BOTH the CV and the website.
#   y        year (string)
#   authors  list of names, in order; ME is bolded automatically on the site
#   t        title
#   u        URL (DOI preferred); None -> rendered as plain text, no link
#   venue_cv venue as it appears on the CV (may contain <i>...</i>)
#   venue_home  site version; None -> derived from venue_cv automatically
#   icon     site icon: ic-factory ic-ballot ic-protest ic-scales ic-chart
#            ic-megaphone ic-briefcase
#   award    optional badge shown on the site
#   featured True -> also appears in the site's Featured Publications block
#   eds/etal editor-volume / 'et al.' author-list markers

PUB_GROUPS = [
  ("Books", [
    dict(y="2023", authors=["Ariel C. Avgar", "Deborah Hann", "J. Ryan Lamare", "David Nash"], t="The Evolution of Workplace Dispute Resolution: International Perspectives", u="https://www.cornellpress.cornell.edu/book/9780913447277/the-evolution-of-workplace-dispute-resolution/", venue_cv="LERA Annual Research Volume.", venue_home="LERA Annual Research Volume.", icon="ic-scales", eds=True, book=True),
  ]),
  ("Journal Articles", [
    dict(y="2026", authors=["Kwon Hee Han", "Tingting Zhang", "J. Ryan Lamare"], t="Methods for Studying Union Effects: A Review and Comparative Analysis of Empirical Industrial Relations Literature", u="https://doi.org/10.1111/irj.70028", venue_cv="<i>Industrial Relations Journal</i> 57(3): 205–231.", venue_home="Industrial Relations Journal, 57(3), 205–231.", icon="ic-chart"),
    dict(y="2025", authors=["John W. Budd", "J. Ryan Lamare"], t="Organizational Governance and Trade-Offs Between Pay and Subjective Employee Well-Being: A Comparative Analysis", u="https://doi.org/10.1111/bjir.12860", venue_cv="<i>British Journal of Industrial Relations</i> 63(2): 305–322.", venue_home="British Journal of Industrial Relations, 63(2), 305–322.", icon="ic-factory", featured=True),
    dict(y="2024", authors=["J. Ryan Lamare", "Richard A. Benton", "Patricia Michel Tabarani"], t="An Empirical Analysis of Race and Political Partisanship Effects on Workplace Mobility Outcomes during Lockdown, Reopening, and Endemic COVID-19", u="https://doi.org/10.1177/00197939241246510", venue_cv="<i>ILR Review</i> 77(4): 475–505.", venue_home="ILR Review, 77(4), 475–505.", icon="ic-factory", featured=True),
    dict(y="2023", authors=["Tony Dobbins", "Stewart Johnstone", "Marta Kahancová", "J. Ryan Lamare", "Adrian Wilkinson"], t="Comparative Impacts of the COVID-19 Pandemic on Work and Employment — Why Industrial Relations Institutions Matter", u="https://doi.org/10.1111/irel.12328", venue_cv="<i>Industrial Relations</i> 62(2): 115–125.", venue_home="Industrial Relations, 62(2), 115–125.", icon="ic-factory", featured=True),
    dict(y="2023", authors=["John W. Budd", "Stewart Johnstone", "J. Ryan Lamare"], t="Never ‘One-Size-Fits-All’: Mick Marchington’s Unique Voice on Voice, from Micro-Level Informality to Macro-Level Turbulence", u="https://doi.org/10.1111/1748-8583.12451", venue_cv="<i>Human Resource Management Journal</i> 33(3): 539–550.", venue_home="Human Resource Management Journal, 33(3), 539–550.", icon="ic-megaphone"),
    dict(y="2023", authors=["Hye Jin Rho", "Christine A. Riordan", "Christian Lyhne Ibsen", "J. Ryan Lamare", "Maite Tapia"], t="Do Workers Speak Up When Feeling Job Insecure? Examining Workers’ Response to Precarity during the COVID-19 Pandemic", u="https://doi.org/10.1177/07308884221128481", venue_cv="<i>Work and Occupations</i> 50(1): 97–129.", venue_home="Work and Occupations, 50(1), 97–129.", icon="ic-megaphone"),
    dict(y="2022", authors=["Weihao Li", "J. Ryan Lamare", "Robert Bruno"], t="Does Union Canvassing Affect Voter Turnout in Times of Political Duress? Empirical Evidence from Illinois", u="https://doi.org/10.1177/0160449X221074153", venue_cv="<i>Labor Studies Journal</i> 47(3): 213–240.", venue_home="Labor Studies Journal, 47(3), 213–240.", icon="ic-ballot"),
    dict(y="2022", authors=["J. Ryan Lamare", "John W. Budd"], t="The Relative Importance of Industrial Relations Ideas in Politics: A Quantitative Analysis of Political Party Manifestos across 54 Countries", u="https://doi.org/10.1111/irel.12296", venue_cv="<i>Industrial Relations</i> 61(1): 22–49.", venue_home="Industrial Relations, 61(1), 22–49.", icon="ic-ballot", award="LERA 2023 Scoville Award", featured=True),
    dict(y="2021", authors=["John W. Budd", "J. Ryan Lamare"], t="The Importance of Political Systems for Trade Union Membership, Coverage, and Influence: Theory and Comparative Evidence", u="https://doi.org/10.1111/bjir.12575", venue_cv="<i>British Journal of Industrial Relations</i> 59(3): 757–787.", venue_home="British Journal of Industrial Relations, 59(3), 757–787.", icon="ic-protest", featured=True),
    dict(y="2021", authors=["Aibak Hafeez", "J. Ryan Lamare"], t="An Empirical Examination of How Third-Party Neutral Sourcing and Qualification Differences Affect Employment ADR Practice Usage: Evidence from the Fortune 1000", u="https://doi.org/10.1108/s0742-618620210000026005", venue_cv="<i>Advances in Industrial and Labor Relations</i> 26: 125–144.", venue_home="Advances in Industrial and Labor Relations, 26, 125–144.", icon="ic-scales"),
    dict(y="2020", authors=["J. Ryan Lamare"], t="The Devil Is in the Details: Attorney Effects on Employment Arbitration Outcomes", u="https://doi.org/10.1177/0019793919877404", venue_cv="<i>ILR Review</i> 73(2): 456–478.", venue_home="ILR Review, 73(2), 456–478.", icon="ic-scales", featured=True),
    dict(y="2020", authors=["David B. Lipsky", "Ariel C. Avgar", "J. Ryan Lamare"], t="Organizational Conflict Resolution and Strategic Choice: Evidence from a Survey of Fortune 1000 Firms", u="https://doi.org/10.1177/0019793919870169", venue_cv="<i>ILR Review</i> 73(2): 431–455.", venue_home="ILR Review, 73(2), 431–455.", icon="ic-scales"),
    dict(y="2019", authors=["J. Ryan Lamare", "David B. Lipsky"], t="Resolving Discrimination Complaints in Employment Arbitration: An Analysis of the Experience in the Securities Industry", u="https://doi.org/10.1177/0019793917747520", venue_cv="<i>ILR Review</i> 72(1): 158–184.", venue_home="ILR Review, 72(1), 158–184.", icon="ic-scales"),
    dict(y="2019", authors=["Elaine Farndale", "J. Ryan Lamare", "Maja Vidovic", "Amar S. Chauhan"], t="Understanding Financial Participation across Market Economies", u="https://doi.org/10.1080/00208825.2019.1646489", venue_cv="<i>International Studies of Management &amp; Organization</i> 49(4): 402–421.", venue_home="International Studies of Management and Organization, 49(4), 402–421.", icon="ic-briefcase"),
    dict(y="2019", authors=["Weihao Li", "Ying Chen", "J. Ryan Lamare"], t="The Effects of Ownership on Labor Standards in China: A Comparison of Foreign Multinationals and Indigenous Firms", u="https://doi.org/10.1108/s0742-618620190000025007", venue_cv="<i>Advances in Industrial and Labor Relations</i> 25: 91–117.", venue_home="Advances in Industrial and Labor Relations, 25, 91–117.", icon="ic-briefcase"),
    dict(y="2018", authors=["John W. Budd", "J. Ryan Lamare", "Andrew R. Timming"], t="Learning about Democracy at Work: Cross-National Evidence on Individual Employee Voice Influencing Political Participation in Civil Society", u="https://doi.org/10.1177/0019793917746619", venue_cv="<i>ILR Review</i> 71(4): 956–985.", venue_home="ILR Review, 71(4), 956–985.", icon="ic-megaphone"),
    dict(y="2017", authors=["M. Teresa Cardador", "Brandon C. Grant", "J. Ryan Lamare", "Gregory B. Northcraft"], t="To Be or Not to Be Unionized? A Social Dilemma Perspective on Worker Decisions to Support Union Organizing", u="https://doi.org/10.1016/j.hrmr.2017.03.003", venue_cv="<i>Human Resource Management Review</i> 27(3): 554–568.", venue_home="Human Resource Management Review, 27(3), 554–568.", icon="ic-protest"),
    dict(y="2016", authors=["J. Ryan Lamare"], t="Union Experience and Worker Policy: Legislative Behavior in California, 1999–2012", u="https://doi.org/10.1177/0019793915610559", venue_cv="<i>ILR Review</i> 69(1): 113–141.", venue_home="ILR Review, 69(1), 113–141.", icon="ic-protest"),
    dict(y="2016", authors=["J. Ryan Lamare"], t="Labor Unions and Political Mobilization: Diminishing Returns of Repetitious Contact", u="https://doi.org/10.1111/irel.12137", venue_cv="<i>Industrial Relations</i> 55(2): 346–374.", venue_home="Industrial Relations, 55(2), 346–374.", icon="ic-ballot"),
    dict(y="2016", authors=["David B. Lipsky", "Ariel C. Avgar", "J. Ryan Lamare"], t="Introduction: New Research on Managing and Resolving Workplace Conflict: Setting the Stage", u="https://doi.org/10.1108/s0742-618620160000022001", venue_cv="<i>Advances in Industrial and Labor Relations</i> 22: ix–xxxi.", venue_home="Advances in Industrial and Labor Relations, 22, ix–xxxi.", icon="ic-scales"),
    dict(y="2016", authors=["J. Ryan Lamare"], t="Beyond Repeat Players: Experience and Employment Arbitration Outcomes in the Securities Industry", u="https://doi.org/10.1108/s0742-618620160000022006", venue_cv="<i>Advances in Industrial and Labor Relations</i> 22: 135–160.", venue_home="Advances in Industrial and Labor Relations, 22, 135–160.", icon="ic-scales"),
    dict(y="2016", authors=["Anthony McDonnell", "Patrick Gunnigle", "Jonathan Lavelle", "J. Ryan Lamare"], t="Beyond Managerial Talent: ‘Key Group’ Identification and Differential Compensation Practices in Multinational Companies", u="https://doi.org/10.1080/09585192.2015.1075571", venue_cv="<i>International Journal of Human Resource Management</i> 27(12): 1299–1318.", venue_home="International Journal of Human Resource Management, 27(12), 1299–1318.", icon="ic-briefcase"),
    dict(y="2015", authors=["J. Ryan Lamare", "James W. Lamare"], t="Electoral Reform, Situational Forces, and Political Confidence: Results from a Multi-Wave Panel", u="https://doi.org/10.1016/j.electstud.2015.09.004", venue_cv="<i>Electoral Studies</i> 40: 361–371.", venue_home="Electoral Studies, 40, 361–371.", icon="ic-ballot"),
    dict(y="2015", authors=["J. Ryan Lamare", "Felicity Lamm", "Nadine McDonnell", "Helen White"], t="Independent, Dependent, and Employee: Contractors and New Zealand’s Pike River Coal Mine Disaster", u="https://doi.org/10.1177/0022185614560596", venue_cv="<i>Journal of Industrial Relations</i> 57(1): 72–93.", venue_home="Journal of Industrial Relations, 57(1), 72–93.", icon="ic-factory"),
    dict(y="2014", authors=["Thomas J. Stipanowich", "J. Ryan Lamare"], t="Living with ADR: Evolving Perceptions and Use of Mediation, Arbitration and Conflict Management in Fortune 1,000 Corporations", u="https://doi.org/10.2139/ssrn.2221471", venue_cv="<i>Harvard Negotiation Law Review</i> 19(Spring): 1–68.", venue_home="Harvard Negotiation Law Review, 19(Spring), 1–68.", icon="ic-scales"),
    dict(y="2014", authors=["J. Ryan Lamare", "David B. Lipsky"], t="Employment Arbitration in the Securities Industry: Lessons from Recent Empirical Research", u="https://www.jstor.org/stable/24052569", venue_cv="<i>Berkeley Journal of Employment and Labor Law</i> 35(1–2): 113–133.", venue_home="Berkeley Journal of Employment and Labor Law, 35(1–2), 113–133.", icon="ic-scales"),
    dict(y="2014", authors=["Michael Wasser", "J. Ryan Lamare"], t="Unions as Conduits of Democratic Voice for Non-Elites: Worker Politicization from the Shop Floor to the Halls of Congress", u="https://scholars.law.unlv.edu/nlj/vol14/iss2/7/", venue_cv="<i>Nevada Law Journal</i> 14(2): 396–413.", venue_home="Nevada Law Journal, 14(2), 396–413.", icon="ic-megaphone"),
    dict(y="2014", authors=["Evelyne Leonard", "Valeria Pulignano", "J. Ryan Lamare", "Tony Edwards"], t="Multinational Corporations as Political Players", u="https://doi.org/10.1177/1024258914525559", venue_cv="<i>Transfer: European Review of Labour and Research</i> 20(2): 171–182.", venue_home="Transfer: European Review of Labour and Research, 20(2), 171–182.", icon="ic-briefcase"),
    dict(y="2013", authors=["J. Ryan Lamare", "Patrick Gunnigle", "Paul Marginson", "Gregor Murray"], t="Union Status and Double-Breasting at Multinational Companies in Three Liberal Market Economies", u="https://doi.org/10.1177/001979391306600306", venue_cv="<i>ILR Review</i> 66(3): 696–722.", venue_home="ILR Review, 66(3), 696–722.", icon="ic-protest"),
    dict(y="2013", authors=["David B. Lipsky", "J. Ryan Lamare", "Abhishek Gupta"], t="The Effect of Gender on Awards in Employment Arbitration Cases: The Experience in the Securities Industry", u="https://doi.org/10.1111/irel.12005", venue_cv="<i>Industrial Relations</i> 52(S1): 314–342.", venue_home="Industrial Relations, 52(S1), 314–342.", icon="ic-scales"),
    dict(y="2013", authors=["J. Ryan Lamare"], t="Mobilization and Voter Turnout: Should Canvassers Worry about the Weather?", u="https://doi.org/10.1017/s1049096513000553", venue_cv="<i>PS: Political Science &amp; Politics</i> 46(3): 580–586.", venue_home="PS: Political Science &amp; Politics, 46(3), 580–586.", icon="ic-ballot"),
    dict(y="2013", authors=["Ariel C. Avgar", "J. Ryan Lamare", "David B. Lipsky", "Abhishek Gupta"], t="Unions and ADR: The Relationship between Labor Unions and Workplace Dispute Resolution in U.S. Corporations", u="https://digitalcommons.ilr.cornell.edu/articles/1275/", venue_cv="<i>Ohio State Journal on Dispute Resolution</i> 28(1): 63–106.", venue_home="Ohio State Journal on Dispute Resolution, 28(1), 63–106.", icon="ic-scales"),
    dict(y="2013", authors=["Maria Figueroa", "Jeff Grabelsky", "J. Ryan Lamare"], t="Community Workforce Agreements: A Tool to Grow the Union Market and to Expand Access to Lifetime Careers in the Unionized Building Trades", u="https://doi.org/10.1177/0160449x13490408", venue_cv="<i>Labor Studies Journal</i> 38(1): 7–31.", venue_home="Labor Studies Journal, 38(1), 7–31.", icon="ic-protest"),
    dict(y="2010", authors=["J. Ryan Lamare"], t="The Interactive Effects of Labor-Led Political Mobilization and Vote Propensity on Turnout: Evidence from Five Elections", u="https://doi.org/10.1111/j.1468-232x.2010.00619.x", venue_cv="<i>Industrial Relations</i> 49(4): 616–639.", venue_home="Industrial Relations, 49(4), 616–639.", icon="ic-ballot"),
    dict(y="2010", authors=["J. Ryan Lamare"], t="Union Influence on Voter Turnout: Results from Three Los Angeles County Elections", u="https://doi.org/10.1177/001979391006300305", venue_cv="<i>ILR Review</i> 63(3): 454–470.", venue_home="ILR Review, 63(3), 454–470.", icon="ic-ballot"),
    dict(y="2010", authors=["Anthony McDonnell", "J. Ryan Lamare", "Patrick Gunnigle", "Jonathan Lavelle"], t="Developing Tomorrow’s Leaders — Evidence of Global Talent Management in Multinational Enterprises", u="https://doi.org/10.1016/j.jwb.2009.09.015", venue_cv="<i>Journal of World Business</i> 45(2): 150–160.", venue_home="Journal of World Business, 45(2), 150–160.", icon="ic-briefcase"),
  ]),
  ("Articles Under Review", [
    dict(raw="J. Ryan Lamare, Margaret Huizinga, and Jeffrey Thomas. “Employment Experience Effects on Socio-Politically Extreme Beliefs: Empirical Evidence from Europe.” 2nd R&R, <i>ILR Review</i>.", y="", u=None),
    dict(raw="J. Ryan Lamare and John W. Budd. “The Role of Political Parties in Shaping Women’s Labor Market Policies and Outcomes: A Longitudinal Analysis of Party Characteristics, Positions, and Effects.” R&R, <i>Industrial Relations</i>.", y="", u=None),
  ]),
  ("Working Papers", [
    dict(raw="Cherise Regier, J. Ryan Lamare, and Faraz Shahidi. “Employee Voice and Workplace Wellbeing in the Age of AI: Cross-National Empirical Evidence.” To be submitted to <i>ILR Review</i>.", y="", u=None),
    dict(raw="Giorgos Galanis, J. Ryan Lamare, and Christian R. Proaño. “Multiplicity, Distance and Unionisation.”", y="", u=None),
  ]),
  ("Book Chapters", [
    dict(y="2024", authors=["Lorenzo Frangi", "John Kallas", "J. Ryan Lamare", "Tingting Zhang"], t="International Trends in Unionisation", u="https://scholar.google.com/scholar?q=International%20Trends%20in%20Unionisation", venue_cv="In M. Morley, P. Gunnigle, and D. Collings, eds., <i>Global Industrial Relations</i>. London: Routledge.", venue_home="In M. Morley, P. Gunnigle, &amp; D. Collings (Eds.), Global Industrial Relations. Routledge.", icon="ic-protest"),
    dict(y="2024", authors=["Kwon Hee Han", "J. Ryan Lamare", "Tingting Zhang"], t="The Evolution of Industrial Relations Research Methods: A Review of Key Union Effects Studies from the late 20th to early 21st Century", u="https://doi.org/10.4337/9781035313891.00013", venue_cv="In J. Parker, N. Donnelly, S. Ressia, and M. Gavin, eds., <i>Field Guide to Researching Employment and Industrial Relations</i>. Cheltenham: Elgar.", venue_home="In J. Parker, N. Donnelly, S. Ressia, &amp; M. Gavin (Eds.), Field Guide to Researching Employment and Industrial Relations. Elgar.", icon="ic-chart"),
    dict(y="2023", authors=["Ariel C. Avgar", "Deborah Hann", "J. Ryan Lamare", "David Nash"], t="Introduction", u="https://eprints.lse.ac.uk/125333/", venue_cv="In <i>The Evolution of Workplace Dispute Resolution: International Perspectives</i>. LERA Annual Research Volume.", venue_home="In The Evolution of Workplace Dispute Resolution: International Perspectives. LERA Annual Research Volume.", icon="ic-scales"),
    dict(y="2023", authors=["Ariel C. Avgar", "J. Ryan Lamare", "Katrina Nobles"], t="Up for the Challenge? Alternative Dispute Resolution at a Crossroads in the United States", u="https://eprints.lse.ac.uk/125334/", venue_cv="In <i>The Evolution of Workplace Dispute Resolution: International Perspectives</i>. LERA Annual Research Volume.", venue_home="In The Evolution of Workplace Dispute Resolution: International Perspectives. LERA Annual Research Volume.", icon="ic-scales"),
    dict(y="2021", authors=["John W. Budd", "J. Ryan Lamare"], t="Worker Voice and Political Participation in Civil Society", u="https://doi.org/10.1007/978-3-319-57365-6_213-1", venue_cv="In K. F. Zimmermann, ed., <i>Handbook of Labor, Human Resources, and Population Economics</i>. New York: Springer.", venue_home="In K. F. Zimmermann (Ed.), Handbook of Labor, Human Resources, and Population Economics. Springer.", icon="ic-megaphone"),
    dict(y="2017", authors=["J. Ryan Lamare", "David B. Lipsky", "Ariel C. Avgar"], t="Empirical Evidence on Critical Issues in Employment Arbitration Generally and Under FINRA in Particular", u="https://scholar.google.com/scholar?q=Empirical%20Evidence%20on%20Critical%20Issues%20in%20Employment%20Arbitration%20Generally%20and%20Under%20FINRA%20in%20Particular", venue_cv="In A. Feliu, W. Outten, J. Drucker, B. Winograd, and A. Bloom, eds., <i>ADR in Employment Law</i>. Arlington, VA: BNA Books.", venue_home="In A. Feliu et al. (Eds.), ADR in Employment Law. BNA Books.", icon="ic-scales"),
    dict(y="2016", authors=["David B. Lipsky", "Ariel C. Avgar", "J. Ryan Lamare"], t="The Evolution of Conflict Management Policies in US Corporations: From Reactive to Strategic", u="https://doi.org/10.1057/978-1-137-51560-5_14", venue_cv="In R. Saundry, P. Latreille, and I. Ashman, eds., <i>Reframing Resolution: Innovation and Change in the Management of Workplace Conflict</i>. London: Palgrave Macmillan.", venue_home="In R. Saundry, P. Latreille, &amp; I. Ashman (Eds.), Reframing Resolution: Innovation and Change in the Management of Workplace Conflict. Palgrave Macmillan.", icon="ic-scales"),
    dict(y="2014", authors=["J. Ryan Lamare", "Elaine Farndale", "Patrick Gunnigle"], t="Employment Relations and IHRM", u="https://scholar.google.com/scholar?q=Employment%20Relations%20and%20IHRM", venue_cv="In D. G. Collings, G. Wood, and P. Caligiuri, eds., <i>The Routledge Companion to International Human Resource Management</i>. London: Routledge.", venue_home="In D. G. Collings, G. Wood, &amp; P. Caligiuri (Eds.), The Routledge Companion to International Human Resource Management. Routledge.", icon="ic-briefcase"),
    dict(y="2014", authors=["David B. Lipsky", "Ariel C. Avgar", "J. Ryan Lamare"], t="Conflict Resolution in the United States", u="https://doi.org/10.1093/oxfordhb/9780199653676.013.0021", venue_cv="In W. K. Roche, P. Teague, and A. J. S. Colvin, eds., <i>The Oxford Handbook on Conflict Management</i>. Oxford: Oxford University Press.", venue_home="In W. K. Roche, P. Teague, &amp; A. J. S. Colvin (Eds.), The Oxford Handbook on Conflict Management. Oxford University Press.", icon="ic-scales"),
    dict(y="2013", authors=["J. Ryan Lamare", "Jonathan Lavelle", "Patrick Gunnigle", "Anthony McDonnell"], t="Multinational Companies and Trade Union Recognition in Ireland", u="https://scholar.google.com/scholar?q=Multinational%20Companies%20and%20Trade%20Union%20Recognition%20in%20Ireland", venue_cv="In T. Turner, D. D’Art, and M. O’Sullivan, eds., <i>Are Trade Unions Still Relevant? Union Recognition 100 Years On</i>. Dublin: Orpen Press.", venue_home="In T. Turner, D. D’Art, &amp; M. O’Sullivan (Eds.), Are Trade Unions Still Relevant? Union Recognition 100 Years On. Orpen Press.", icon="ic-protest"),
    dict(y="2011", authors=["J. Ryan Lamare"], t="Employees without Protections: The Misclassification of Vulnerable Workers in New York", u="https://scholar.google.com/scholar?q=Employees%20without%20Protections%3A%20The%20Misclassification%20of%20Vulnerable%20Workers%20in%20New%20York", venue_cv="In M. Sargeant and M. Giovannone, eds., <i>Vulnerable Workers — Safety, Well-Being, and Precarious Work</i>. London: Gower.", venue_home="In M. Sargeant &amp; M. Giovannone (Eds.), Vulnerable Workers — Safety, Well-Being, and Precarious Work. Gower.", icon="ic-factory"),
    dict(y="2011", authors=["Mark Boocock", "Zeenie Hannif", "Suzanne Jamieson", "J. Ryan Lamare"], t="OHS of Migrant Workers: An International Concern", u="https://scholar.google.com/scholar?q=OHS%20of%20Migrant%20Workers%3A%20An%20International%20Concern", venue_cv="In M. Sargeant and M. Giovannone, eds., <i>Vulnerable Workers — Safety, Well-Being, and Precarious Work</i>. London: Gower.", venue_home="In M. Sargeant &amp; M. Giovannone (Eds.), Vulnerable Workers — Safety, Well-Being, and Precarious Work. Gower.", icon="ic-factory", etal=True),
    dict(y="2011", authors=["Danae Anderson", "J. Ryan Lamare", "Zeenie Hannif"], t="The Working Experiences of Student Migrants in Australia and New Zealand", u="https://scholar.google.com/scholar?q=The%20Working%20Experiences%20of%20Student%20Migrants%20in%20Australia%20and%20New%20Zealand", venue_cv="In R. Price, P. McDonald, J. Bailey, and B. Pini, eds., <i>Young People at Work</i>. London: Gower.", venue_home="In R. Price, P. McDonald, J. Bailey, &amp; B. Pini (Eds.), Young People at Work. Gower.", icon="ic-factory"),
    dict(y="2009", authors=["Anthony McDonnell", "J. Ryan Lamare", "Jonathan Lavelle"], t="Managing Across Borders: Autonomy, Coordination and Control in MNCs", u="https://scholar.google.com/scholar?q=Managing%20Across%20Borders%3A%20Autonomy%2C%20Coordination%20and%20Control%20in%20MNCs", venue_cv="In J. Lavelle, A. McDonnell, and P. Gunnigle, eds., <i>Human Resource Practices in Multinational Companies in Ireland</i>. Dublin: Labour Relations Commission.", venue_home="In J. Lavelle, A. McDonnell, &amp; P. Gunnigle (Eds.), Human Resource Practices in Multinational Companies in Ireland. Labour Relations Commission, Ireland.", icon="ic-briefcase"),
    dict(y="2009", authors=["Felicity Lamm", "Gaye Greenwood", "J. Ryan Lamare", "Barry Foster"], t="Bargaining, Negotiation and the Resolution of Conflict", u="https://scholar.google.com/scholar?q=Bargaining%2C%20Negotiation%20and%20the%20Resolution%20of%20Conflict", venue_cv="In E. Rasmussen, Employment Relations in New Zealand (2nd ed.). Auckland: Pearson.", venue_home="In E. Rasmussen, Employment Relations in New Zealand (2nd ed.). Pearson.", icon="ic-scales"),
  ]),
  ("Reports, Reviews &amp; Other", [
    dict(y="2026", authors=["J. Ryan Lamare", "Margaret Huizinga"], t="Entry: Organized Labor", u=None, venue_cv="In <i>Encyclopedia of International Human Resource Management and Global Talent Management</i> (accepted).", venue_home="In Encyclopedia of International Human Resource Management and Global Talent Management (accepted).", icon="ic-protest"),
    dict(y="2026", authors=["J. Ryan Lamare", "Margaret Huizinga"], t="Entry: International Labour Organization (ILO)", u=None, venue_cv="In <i>Encyclopedia of International Human Resource Management and Global Talent Management</i> (accepted).", venue_home="In Encyclopedia of International Human Resource Management and Global Talent Management (accepted).", icon="ic-factory"),
    dict(y="2021", authors=["J. Ryan Lamare"], t="Book review: McKersie, R. B. (2018), A Field in Flux: Sixty Years of Industrial Relations", u="https://doi.org/10.1177/07308884211008208", venue_cv="<i>Work and Occupations</i> 48(4): 502–504.", venue_home="Work and Occupations, 48(4), 502–504.", icon="ic-factory"),
    dict(y="2014", authors=["David B. Lipsky", "J. Ryan Lamare", "Michael D. Maffie"], t="Mandatory Employment Arbitration: Dispelling the Myths", u="https://doi.org/10.1002/alt.21546", venue_cv="<i>Alternatives to the High Cost of Litigation</i> 32(9): 133–146.", venue_home="Alternatives to the High Cost of Litigation, 32(9), 133–146.", icon="ic-scales"),
    dict(y="2014", authors=["J. Ryan Lamare"], t="The Evolution of ADR Systems at Large U.S. Corporations", u=None, venue_cv="<i>Dispute Resolution Magazine</i> 20(3): 4–7.", venue_home="Dispute Resolution Magazine, 20(3), 4–7.", icon="ic-scales"),
    dict(y="2014", authors=["Felicity Lamm", "Nadine McDonnell", "J. Ryan Lamare"], t="The Impact of Disasters on Independent Contractors: Victims of Circumstances", u=None, venue_cv="<i>E-Journal of International and Comparative Labour Studies</i> 3(3): 79–109.", venue_home="E-Journal of International and Comparative Labour Studies, 3(3), 79–109.", icon="ic-factory"),
    dict(y="2013", authors=["J. Ryan Lamare"], t="The Arbitration of Employment Discrimination Cases in the Securities Industry", u=None, venue_cv="<i>Dispute Resolution Journal</i> 68(1): 97–102.", venue_home="Dispute Resolution Journal, 68(1), 97–102.", icon="ic-scales"),
    dict(y="2012", authors=["David Holman", "J. Ryan Lamare", "Damian Grimshaw", "Lynne Holdsworth", "Mick Marchington"], t="The Diffusion of ‘Good’ HR Practices Across the Supply Chain", u=None, venue_cv="Manchester: ACAS.", venue_home="Manchester: ACAS.", icon="ic-briefcase"),
    dict(y="2011", authors=["Maria Figueroa", "Jeff Grabelsky", "J. Ryan Lamare"], t="Community Workforce Provisions in Project Labor Agreements: A Tool for Building Middle-Class Careers", u=None, venue_cv="Ithaca, NY: Cornell University ILR School.", venue_home="Ithaca, NY: Cornell University ILR School.", icon="ic-protest"),
    dict(y="2011", authors=["John Logan", "Erin Johansson", "J. Ryan Lamare"], t="New Data: NLRB Process Fails to Ensure a Fair Vote", u=None, venue_cv="Berkeley, CA: UC Berkeley Center for Labor Research and Education.", venue_home="Berkeley, CA: UC Berkeley Center for Labor Research and Education.", icon="ic-protest"),
    dict(y="2010", authors=["David B. Lipsky", "Ronald L. Seeber", "J. Ryan Lamare"], t="Equity and Efficiency in Employment Arbitration: Lessons from FINRA", u=None, venue_cv="<i>Dispute Resolution Journal</i>.", venue_home="Dispute Resolution Journal.", icon="ic-scales"),
    dict(y="2007", authors=["Fred B. Kotler", "J. Ryan Lamare", "Linda H. Donahue"], t="The Cost of Worker Misclassification in New York State", u=None, venue_cv="Ithaca, NY: Cornell University ILR School.", venue_home="Ithaca, NY: Cornell University ILR School.", icon="ic-factory"),
  ]),
]

# ------------------------------------------------- the rest of the CV, in order
# ('h2', html, attrs) section heading   ('h3', html) subheading
# ('note', html, attrs) inline label    ('row', year, html, url) a CV line
# ('PUBS',) is where PUB_GROUPS above gets spliced in.

BLOCKS = [
  ["h2", "Appointments", ""],
  ["h3", "London School of Economics and Political Science — Department of Management", None],
  ["row", "2024–", "Professor", None],
  ["row", "2024–", "Faculty Group Lead, Employment Relations and Human Resource Management", None],
  ["row", "2024–", "PhD Programme Director", None],
  ["h3", "Previous Positions", None],
  ["note", "University of Illinois Urbana-Champaign — School of Labor and Employment Relations", " style=\"margin:0 0 4pt\""],
  ["row", "2022–2024", "Reuben G. Soderstrom International Labor Relations Professor", None],
  ["row", "2021–2022", "Professor", None],
  ["row", "2017–2021", "Associate Professor", None],
  ["row", "2015–2017", "Assistant Professor", None],
  ["note", "Pennsylvania State University — School of Labor and Employment Relations", " style=\"margin:5pt 0 4pt\""],
  ["row", "2012–2015", "Assistant Professor", None],
  ["note", "University of Manchester — People, Management, and Organisations Division", " style=\"margin:5pt 0 4pt\""],
  ["row", "2010–2011", "Lecturer (equivalent to Assistant Professor)", None],
  ["note", "University of Limerick — Department of Personnel and Employment Relations", " style=\"margin:5pt 0 4pt\""],
  ["row", "2008–2010", "Research Scholar", None],
  ["h2", "Education", ""],
  ["note", "Cornell University — School of Industrial and Labor Relations", " style=\"margin:0 0 4pt\""],
  ["row", "2008", "<span class=\"ecell\">PhD</span><span class=\"ecell eyr\">2005</span><span class=\"ecell\">MS</span><span class=\"ecell eyr\">2004</span><span>BS</span>", None],
  ["h2", "Editorial Positions", ""],
  ["row", "2024–", "Editor-in-Chief, <i>British Journal of Industrial Relations</i>", None],
  ["row", "2020–2024", "Editor-in-Chief, Labor and Employment Relations Association (LERA)", None],
  ["row", "2022–2024", "Associate Editor, <i>Labour and Industry</i>", None],
  ["h3", "Editorial Advisory Boards", None],
  ["row", "2022–", "<i>Human Resource Management</i>", None],
  ["row", "2016–", "<i>Human Resource Management Review</i>", None],
  ["row", "2014–", "<i>Human Resource Management Journal</i>", None],
  ["h3", "Special Issue Guest Editor", None],
  ["row", "2024–", "<i>ILR Review</i> — political parties, political systems, and industrial relations", None],
  ["row", "2020–2023", "<i>Industrial Relations</i> — the impacts of COVID-19 on employment relations", None],
  ["row", "2015–2016", "<i>Advances in Industrial and Labor Relations</i> — conflict management", None],
  ["h2", "Honours &amp; Awards", ""],
  ["row", "2023", "James G. Scoville Best International/Comparative Industrial Relations Paper (LERA)", None],
  ["row", "2018", "Luis Aparicio Prize, runner-up (ILERA)", None],
  ["row", "2015", "John T. Dunlop Outstanding Scholar (LERA)", None],
  ["row", "2010", "Thomas A. Kochan &amp; Stephen R. Sleigh Best Dissertation, honourable mention (LERA)", None],
  ["h2", "Publications", " class=\"pagebreak\""],
  ["PUBS"],
  ["h2", "Research Grants", ""],
  ["row", "2026", "National Academy of Arbitrators — British employment tribunal effectiveness and fairness in resolving public disputes (with William Fleming)", None],
  ["row", "2020", "National Academy of Arbitrators — seed grant for research on workplace conflict management", None],
  ["row", "2019", "Cornell Center for Advanced Human Resource Studies — organizational conflict management strategies at Fortune 1000 firms (with Ariel C. Avgar and David B. Lipsky)", None],
  ["row", "2019", "National Academy of Arbitrators — organizational conflict management strategies at Fortune 1000 firms (with Ariel C. Avgar and David B. Lipsky)", None],
  ["row", "2014", "Center for Global Studies, Pennsylvania State University — cross-national comparisons of ADR systems at large U.K. and U.S. corporations", None],
  ["row", "2013", "Searle Civil Justice Institute, Law &amp; Economics Center, George Mason University School of Law — employment arbitration in the securities industry (with David B. Lipsky)", None],
  ["row", "2011", "Fairness at Work Pilot Project — diffusion of HR practices across supply chains (with Damian Grimshaw, David Holman, Mick Marchington, and Jill Rubery)", None],
  ["row", "2010", "ACAS Research Partnership — diffusion of HR practices across supply chains (with Grimshaw, Holman, Marchington, and Rubery)", None],
  ["row", "2008", "Seed Funding Research Grant — governance structures and multinational companies (with Jonathan Lavelle)", None],
  ["h2", "Keynote &amp; Plenary Addresses", ""],
  ["row", "2024", "“Industrial Relations Research in the Era of Crises: Rethinking How Unions and Politics Interact.” BUIRA keynote address", None],
  ["h2", "Invited Talks", ""],
  ["row", "2022", "“An Empirical Analysis of Race and Political Partisanship Effects on Workplace Mobility Outcomes during COVID-19.” IRRU, Warwick Business School", None],
  ["row", "2021", "“Leveraging ADR to Deliver on Strategic Goals in Organizations: Evidence and Applications from the U.S.” PrOPEL Hub masterclass (Strathclyde, Sheffield, and CIPD)", None],
  ["row", "2019", "“An Empirical Assessment of Employment Arbitration Agreements.” Invited panel discussant, George Mason University", None],
  ["row", "2018", "“Vulnerability, Immigration, and Political Participation: Empirical Evidence from California.” University of Illinois Urbana-Champaign", None],
  ["row", "2014", "“The Strategic Underpinnings of Conflict Management in U.S. Corporations.” Sheffield University; Pennsylvania State University", None],
  ["row", "2013", "“Resolving Discrimination Complaints in Employment Arbitration.” George Mason University", None],
  ["row", "2013", "“Living with ADR: Evolving Perceptions and Use of Mediation, Arbitration and Conflict Management in Fortune 1,000 Corporations.” Yale University", None],
  ["row", "2012", "“The Effects of Gender and Repetition on Securities Industry Employment Arbitration Awards.” American Rights at Work", None],
  ["row", "2011", "“Employee Representation, Multinational Companies and Institutional Context.” Pennsylvania State University", None],
  ["row", "2010", "“The Industrial Relations System in the United States.” Trinity College Dublin", None],
  ["row", "2008", "“Union Mobilization and Voter Turnout in Los Angeles.” Cornell University", None],
  ["h2", "Public Engagement &amp; Media", ""],
  ["row", "2024", "“What organisations can learn from a Black bus driver in Michigan.” <i>LSE Business Review</i>", None],
  ["row", "2024", "“Race and Politics in US Crises.” <i>Management With Impact</i> podcast, episode 1", None],
  ["row", "2020", "Research featured by the University of Illinois News Bureau (also 2018, 2015)", None],
  ["h2", "Teaching", ""],
  ["h3", "London School of Economics", None],
  ["row", "", "The Management of People in Global Companies · Employment Relations and Human Resource Management Seminar · A Social Sciences Perspective of Academic Research in Management · Advanced Quantitative Analysis for Research in Management", None],
  ["h3", "University of Illinois Urbana-Champaign", None],
  ["row", "", "Collective Bargaining · Game Theory and HR Strategy · Human Resource Management · HRM and Strategy · Industrial Relations Theory · Negotiations · Workplace Dispute Resolution", None],
  ["h3", "Pennsylvania State University", None],
  ["row", "", "Intro to Employment Relations · Seminar in Employment Relations · Workplace Dispute Resolution", None],
  ["h3", "University of Manchester", None],
  ["row", "", "Human Resource Management · International Human Resource Management · Strategic Human Resource Management", None],
  ["h3", "Teaching Awards", None],
  ["row", "2018–2022", "LER Faculty Teaching Excellence Award (three times), University of Illinois", None],
  ["row", "2015–2024", "List of Teachers Rated as Excellent, University of Illinois", None],
  ["h2", "Non-Academic Positions", ""],
  ["row", "2010–2012", "Research Analyst, American Rights at Work", None],
  ["h2", "Service &amp; Professional Activities", ""],
  ["h3", "PhD Supervision", None],
  ["row", "", "Chair: Brandon C. Grant (first position, SUNY Farmingdale) · Aibak Hafeez (Cornell University) · Weihao Li (IAMAW)", None],
  ["row", "", "Committee member: Yin Lee (NEOMA Business School) · Ki-Jung Kim (Eastern Kentucky University) · Kwon Hee Han (Louisiana State University)", None],
  ["row", "", "Current: Margaret Huizinga", None],
  ["h3", "Committees — London School of Economics", None],
  ["row", "", "ER/HR Search Committee (2023–2024); Macro OB Search Committee (2024)", None],
  ["h3", "Committees — University of Illinois", None],
  ["row", "", "Dean Search Committee (2018–2019, 2021–2022); IR Search Committee (2018, 2020, chair 2021); Soderstrom Professor Search Committee (chair, 2019); HR/IR Search Committee (2015–2016, chair 2023); Executive Committee (2017–2020, 2021–2024); PhD Advisory Committee (2015–2023); MHRIR Admissions (2020–2023); Provost’s Labor Advisory Group (2019–); Faculty Senate (2016–2017)", None],
  ["h3", "Committees — Pennsylvania State University", None],
  ["row", "", "Undergraduate, Graduate, Search, and Strategic Planning Committees (2012–2015)", None],
  ["h3", "Labor and Employment Relations Association", None],
  ["row", "", "Nominating Committee Chair (2026); Secretary-Treasurer (2019–2020); Editorial Committee Chair (2020–2024); Poster Session Chair (2016–2019)", None],
  ["h3", "Ad-Hoc Reviewer", None],
  ["row", "", "ILR Review · Industrial Relations · British Journal of Industrial Relations · European Journal of Industrial Relations · Human Relations · Journal of World Business · Human Resource Management Journal · Journal of Policy Analysis and Management · American Political Science Review · American Journal of Political Science · Nature Human Behaviour; among others", None],
]
