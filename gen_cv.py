# -*- coding: utf-8 -*-
"""Builds Lamare-CV-source.html — a self-contained, human-editable CV.
Render to PDF with: weasyprint Lamare-CV-source.html Lamare-CV.pdf
"""
import html as _h
import re as _re

LDQ, RDQ, APO, NDASH = "\u201c", "\u201d", "\u2019", "\u2013"
ME = "J. Ryan Lamare"

def esc(s): return _h.escape(s, quote=False)
def authors(s):
    return esc(s)

def _ital_journal(v):
    m = _re.match(r'^(.+?)(\s\d.*)$', v)
    return f'<i>{m.group(1)}</i>{m.group(2)}' if m else v

def _ital_book(v):
    for marker in (' eds., ', ' ed., '):
        i = v.find(marker)
        if i != -1:
            s = i + len(marker); rest = v[s:]; j = rest.rfind('. ')
            return v[:s] + f'<i>{rest[:j]}</i>' + rest[j:] if j != -1 else v
    if v.startswith('In The Evolution of Workplace Dispute Resolution'):
        rest = v[3:]; j = rest.rfind('. ')
        if j != -1:
            return 'In ' + f'<i>{rest[:j]}</i>' + rest[j:]
    return v

def fmt_venue(v, kind):
    v = esc(v)
    if kind in ('journal', 'report'):
        out = _ital_journal(v)
        if out != v:
            return out
        if kind == 'report':
            m = _re.match(r'^In (.+?)( \(accepted\)\.)$', v)
            if m:
                return f'In <i>{m.group(1)}</i>{m.group(2)}'
            if ':' not in v:  # bare journal name, e.g. "Dispute Resolution Journal."
                m2 = _re.match(r'^(.+?)(\.)$', v)
                if m2:
                    return f'<i>{m2.group(1)}</i>{m2.group(2)}'
        return v
    if kind == 'chapter':
        return _ital_book(v)
    return v

# ---- entry rows -------------------------------------------------------------
def pub(e, kind="journal"):
    u = e.get("u")
    t = f'<i>{esc(e["t"])}</i>' if kind == "book" else f"{LDQ}{esc(e['t'])}{RDQ}"
    v = f' {fmt_venue(e["v"], kind)}' if e.get("v") else ""
    sep = "" if e["a"].rstrip().endswith(".") else "."
    it = f'{authors(e["a"])}{sep} {t}.{v}'
    yr = esc(e["y"])
    if u:
        return (f'<a class="row rowlink" href="{u}">'
                f'<div class="yr">{yr}</div><div class="it">{it}</div></a>')
    return (f'<div class="row"><div class="yr">{yr}</div>'
            f'<div class="it">{it}</div></div>')

def simple(y, body):
    if body.endswith("."):
        body = body[:-1]
    return f'<div class="row"><div class="yr">{esc(y)}</div><div class="it">{body}</div></div>'

# ---- data -------------------------------------------------------------------
BOOKS = [dict(y="2023", a="Ariel C. Avgar, Deborah Hann, J. Ryan Lamare, and David Nash, eds.",
    t="The Evolution of Workplace Dispute Resolution: International Perspectives",
    v="LERA Annual Research Volume.",
    u="https://www.cornellpress.cornell.edu/book/9780913447277/the-evolution-of-workplace-dispute-resolution/")]

ARTICLES = [
 dict(y="2026", a="Kwon Hee Han, Tingting Zhang, and J. Ryan Lamare", t="Methods for Studying Union Effects: A Review and Comparative Analysis of Empirical Industrial Relations Literature", v="Industrial Relations Journal 57(3): 205\u2013231.", u="https://doi.org/10.1111/irj.70028"),
 dict(y="2025", a="John W. Budd and J. Ryan Lamare", t="Organizational Governance and Trade-Offs Between Pay and Subjective Employee Well-Being: A Comparative Analysis", v="British Journal of Industrial Relations 63(2): 305\u2013322.", u="https://doi.org/10.1111/bjir.12860"),
 dict(y="2024", a="J. Ryan Lamare, Richard A. Benton, and Patricia Michel Tabarani", t="An Empirical Analysis of Race and Political Partisanship Effects on Workplace Mobility Outcomes during Lockdown, Reopening, and Endemic COVID-19", v="ILR Review 77(4): 475\u2013505.", u="https://doi.org/10.1177/00197939241246510"),
 dict(y="2023", a="Tony Dobbins, Stewart Johnstone, Marta Kahancov\u00e1, J. Ryan Lamare, and Adrian Wilkinson", t="Comparative Impacts of the COVID-19 Pandemic on Work and Employment \u2014 Why Industrial Relations Institutions Matter", v="Industrial Relations 62(2): 115\u2013125.", u="https://doi.org/10.1111/irel.12328"),
 dict(y="2023", a="John W. Budd, Stewart Johnstone, and J. Ryan Lamare", t="Never \u2018One-Size-Fits-All\u2019: Mick Marchington\u2019s Unique Voice on Voice, from Micro-Level Informality to Macro-Level Turbulence", v="Human Resource Management Journal 33(3): 539\u2013550.", u="https://doi.org/10.1111/1748-8583.12451"),
 dict(y="2023", a="Hye Jin Rho, Christine A. Riordan, Christian Lyhne Ibsen, J. Ryan Lamare, and Maite Tapia", t="Do Workers Speak Up When Feeling Job Insecure? Examining Workers\u2019 Response to Precarity during the COVID-19 Pandemic", v="Work and Occupations 50(1): 97\u2013129.", u="https://doi.org/10.1177/07308884221128481"),
 dict(y="2022", a="Weihao Li, J. Ryan Lamare, and Robert Bruno", t="Does Union Canvassing Affect Voter Turnout in Times of Political Duress? Empirical Evidence from Illinois", v="Labor Studies Journal 47(3): 213\u2013240.", u="https://doi.org/10.1177/0160449X221074153"),
 dict(y="2022", a="J. Ryan Lamare and John W. Budd", t="The Relative Importance of Industrial Relations Ideas in Politics: A Quantitative Analysis of Political Party Manifestos across 54 Countries", v="Industrial Relations 61(1): 22\u201349.", u="https://doi.org/10.1111/irel.12296"),
 dict(y="2021", a="John W. Budd and J. Ryan Lamare", t="The Importance of Political Systems for Trade Union Membership, Coverage, and Influence: Theory and Comparative Evidence", v="British Journal of Industrial Relations 59(3): 757\u2013787.", u="https://doi.org/10.1111/bjir.12575"),
 dict(y="2021", a="Aibak Hafeez and J. Ryan Lamare", t="An Empirical Examination of How Third-Party Neutral Sourcing and Qualification Differences Affect Employment ADR Practice Usage: Evidence from the Fortune 1000", v="Advances in Industrial and Labor Relations 26: 125\u2013144.", u="https://doi.org/10.1108/s0742-618620210000026005"),
 dict(y="2020", a="J. Ryan Lamare", t="The Devil Is in the Details: Attorney Effects on Employment Arbitration Outcomes", v="ILR Review 73(2): 456\u2013478.", u="https://doi.org/10.1177/0019793919877404"),
 dict(y="2020", a="David B. Lipsky, Ariel C. Avgar, and J. Ryan Lamare", t="Organizational Conflict Resolution and Strategic Choice: Evidence from a Survey of Fortune 1000 Firms", v="ILR Review 73(2): 431\u2013455.", u="https://doi.org/10.1177/0019793919870169"),
 dict(y="2019", a="J. Ryan Lamare and David B. Lipsky", t="Resolving Discrimination Complaints in Employment Arbitration: An Analysis of the Experience in the Securities Industry", v="ILR Review 72(1): 158\u2013184.", u="https://doi.org/10.1177/0019793917747520"),
 dict(y="2019", a="Elaine Farndale, J. Ryan Lamare, Maja Vidovic, and Amar S. Chauhan", t="Understanding Financial Participation across Market Economies", v="International Studies of Management & Organization 49(4): 402\u2013421.", u="https://doi.org/10.1080/00208825.2019.1646489"),
 dict(y="2019", a="Weihao Li, Ying Chen, and J. Ryan Lamare", t="The Effects of Ownership on Labor Standards in China: A Comparison of Foreign Multinationals and Indigenous Firms", v="Advances in Industrial and Labor Relations 25: 91\u2013117.", u="https://doi.org/10.1108/s0742-618620190000025007"),
 dict(y="2018", a="John W. Budd, J. Ryan Lamare, and Andrew R. Timming", t="Learning about Democracy at Work: Cross-National Evidence on Individual Employee Voice Influencing Political Participation in Civil Society", v="ILR Review 71(4): 956\u2013985.", u="https://doi.org/10.1177/0019793917746619"),
 dict(y="2017", a="M. Teresa Cardador, Brandon C. Grant, J. Ryan Lamare, and Gregory B. Northcraft", t="To Be or Not to Be Unionized? A Social Dilemma Perspective on Worker Decisions to Support Union Organizing", v="Human Resource Management Review 27(3): 554\u2013568.", u="https://doi.org/10.1016/j.hrmr.2017.03.003"),
 dict(y="2016", a="J. Ryan Lamare", t="Union Experience and Worker Policy: Legislative Behavior in California, 1999\u20132012", v="ILR Review 69(1): 113\u2013141.", u="https://doi.org/10.1177/0019793915610559"),
 dict(y="2016", a="J. Ryan Lamare", t="Labor Unions and Political Mobilization: Diminishing Returns of Repetitious Contact", v="Industrial Relations 55(2): 346\u2013374.", u="https://doi.org/10.1111/irel.12137"),
 dict(y="2016", a="David B. Lipsky, Ariel C. Avgar, and J. Ryan Lamare", t="Introduction: New Research on Managing and Resolving Workplace Conflict: Setting the Stage", v="Advances in Industrial and Labor Relations 22: ix\u2013xxxi.", u="https://doi.org/10.1108/s0742-618620160000022001"),
 dict(y="2016", a="J. Ryan Lamare", t="Beyond Repeat Players: Experience and Employment Arbitration Outcomes in the Securities Industry", v="Advances in Industrial and Labor Relations 22: 135\u2013160.", u="https://doi.org/10.1108/s0742-618620160000022006"),
 dict(y="2016", a="Anthony McDonnell, Patrick Gunnigle, Jonathan Lavelle, and J. Ryan Lamare", t="Beyond Managerial Talent: \u2018Key Group\u2019 Identification and Differential Compensation Practices in Multinational Companies", v="International Journal of Human Resource Management 27(12): 1299\u20131318.", u="https://doi.org/10.1080/09585192.2015.1075571"),
 dict(y="2015", a="J. Ryan Lamare and James W. Lamare", t="Electoral Reform, Situational Forces, and Political Confidence: Results from a Multi-Wave Panel", v="Electoral Studies 40: 361\u2013371.", u="https://doi.org/10.1016/j.electstud.2015.09.004"),
 dict(y="2015", a="J. Ryan Lamare, Felicity Lamm, Nadine McDonnell, and Helen White", t="Independent, Dependent, and Employee: Contractors and New Zealand\u2019s Pike River Coal Mine Disaster", v="Journal of Industrial Relations 57(1): 72\u201393.", u="https://doi.org/10.1177/0022185614560596"),
 dict(y="2014", a="Thomas J. Stipanowich and J. Ryan Lamare", t="Living with ADR: Evolving Perceptions and Use of Mediation, Arbitration and Conflict Management in Fortune 1,000 Corporations", v="Harvard Negotiation Law Review 19(Spring): 1\u201368.", u="https://doi.org/10.2139/ssrn.2221471"),
 dict(y="2014", a="J. Ryan Lamare and David B. Lipsky", t="Employment Arbitration in the Securities Industry: Lessons from Recent Empirical Research", v="Berkeley Journal of Employment and Labor Law 35(1\u20132): 113\u2013133.", u="https://www.jstor.org/stable/24052569"),
 dict(y="2014", a="Michael Wasser and J. Ryan Lamare", t="Unions as Conduits of Democratic Voice for Non-Elites: Worker Politicization from the Shop Floor to the Halls of Congress", v="Nevada Law Journal 14(2): 396\u2013413.", u="https://scholars.law.unlv.edu/nlj/vol14/iss2/7/"),
 dict(y="2014", a="Evelyne Leonard, Valeria Pulignano, J. Ryan Lamare, and Tony Edwards", t="Multinational Corporations as Political Players", v="Transfer: European Review of Labour and Research 20(2): 171\u2013182.", u="https://doi.org/10.1177/1024258914525559"),
 dict(y="2013", a="J. Ryan Lamare, Patrick Gunnigle, Paul Marginson, and Gregor Murray", t="Union Status and Double-Breasting at Multinational Companies in Three Liberal Market Economies", v="ILR Review 66(3): 696\u2013722.", u="https://doi.org/10.1177/001979391306600306"),
 dict(y="2013", a="David B. Lipsky, J. Ryan Lamare, and Abhishek Gupta", t="The Effect of Gender on Awards in Employment Arbitration Cases: The Experience in the Securities Industry", v="Industrial Relations 52(S1): 314\u2013342.", u="https://doi.org/10.1111/irel.12005"),
 dict(y="2013", a="J. Ryan Lamare", t="Mobilization and Voter Turnout: Should Canvassers Worry about the Weather?", v="PS: Political Science & Politics 46(3): 580\u2013586.", u="https://doi.org/10.1017/s1049096513000553"),
 dict(y="2013", a="Ariel C. Avgar, J. Ryan Lamare, David B. Lipsky, and Abhishek Gupta", t="Unions and ADR: The Relationship between Labor Unions and Workplace Dispute Resolution in U.S. Corporations", v="Ohio State Journal on Dispute Resolution 28(1): 63\u2013106.", u="https://digitalcommons.ilr.cornell.edu/articles/1275/"),
 dict(y="2013", a="Maria Figueroa, Jeff Grabelsky, and J. Ryan Lamare", t="Community Workforce Agreements: A Tool to Grow the Union Market and to Expand Access to Lifetime Careers in the Unionized Building Trades", v="Labor Studies Journal 38(1): 7\u201331.", u="https://doi.org/10.1177/0160449x13490408"),
 dict(y="2010", a="J. Ryan Lamare", t="The Interactive Effects of Labor-Led Political Mobilization and Vote Propensity on Turnout: Evidence from Five Elections", v="Industrial Relations 49(4): 616\u2013639.", u="https://doi.org/10.1111/j.1468-232x.2010.00619.x"),
 dict(y="2010", a="J. Ryan Lamare", t="Union Influence on Voter Turnout: Results from Three Los Angeles County Elections", v="ILR Review 63(3): 454\u2013470.", u="https://doi.org/10.1177/001979391006300305"),
 dict(y="2010", a="Anthony McDonnell, J. Ryan Lamare, Patrick Gunnigle, and Jonathan Lavelle", t="Developing Tomorrow\u2019s Leaders \u2014 Evidence of Global Talent Management in Multinational Enterprises", v="Journal of World Business 45(2): 150\u2013160.", u="https://doi.org/10.1016/j.jwb.2009.09.015"),
]

CHAPTERS = [
 dict(y="2024", a="Lorenzo Frangi, John Kallas, J. Ryan Lamare, and Tingting Zhang", t="International Trends in Unionisation", v="In M. Morley, P. Gunnigle, and D. Collings, eds., Global Industrial Relations. London: Routledge.", u="https://scholar.google.com/scholar?q=International%20Trends%20in%20Unionisation"),
 dict(y="2024", a="Kwon Hee Han, J. Ryan Lamare, and Tingting Zhang", t="The Evolution of Industrial Relations Research Methods: A Review of Key Union Effects Studies from the late 20th to early 21st Century", v="In J. Parker, N. Donnelly, S. Ressia, and M. Gavin, eds., Field Guide to Researching Employment and Industrial Relations. Cheltenham: Elgar.", u="https://doi.org/10.4337/9781035313891.00013"),
 dict(y="2023", a="Ariel C. Avgar, Deborah Hann, J. Ryan Lamare, and David Nash", t="Introduction", v="In The Evolution of Workplace Dispute Resolution: International Perspectives. LERA Annual Research Volume.", u="https://eprints.lse.ac.uk/125333/"),
 dict(y="2023", a="Ariel C. Avgar, J. Ryan Lamare, and Katrina Nobles", t="Up for the Challenge? Alternative Dispute Resolution at a Crossroads in the United States", v="In The Evolution of Workplace Dispute Resolution: International Perspectives. LERA Annual Research Volume.", u="https://eprints.lse.ac.uk/125334/"),
 dict(y="2021", a="John W. Budd and J. Ryan Lamare", t="Worker Voice and Political Participation in Civil Society", v="In K. F. Zimmermann, ed., Handbook of Labor, Human Resources, and Population Economics. New York: Springer.", u="https://doi.org/10.1007/978-3-319-57365-6_213-1"),
 dict(y="2017", a="J. Ryan Lamare, David B. Lipsky, and Ariel C. Avgar", t="Empirical Evidence on Critical Issues in Employment Arbitration Generally and Under FINRA in Particular", v="In A. Feliu, W. Outten, J. Drucker, B. Winograd, and A. Bloom, eds., ADR in Employment Law. Arlington, VA: BNA Books.", u="https://scholar.google.com/scholar?q=Empirical%20Evidence%20on%20Critical%20Issues%20in%20Employment%20Arbitration"),
 dict(y="2016", a="David B. Lipsky, Ariel C. Avgar, and J. Ryan Lamare", t="The Evolution of Conflict Management Policies in US Corporations: From Reactive to Strategic", v="In R. Saundry, P. Latreille, and I. Ashman, eds., Reframing Resolution: Innovation and Change in the Management of Workplace Conflict. London: Palgrave Macmillan.", u="https://doi.org/10.1057/978-1-137-51560-5_14"),
 dict(y="2014", a="J. Ryan Lamare, Elaine Farndale, and Patrick Gunnigle", t="Employment Relations and IHRM", v="In D. G. Collings, G. Wood, and P. Caligiuri, eds., The Routledge Companion to International Human Resource Management. London: Routledge.", u="https://scholar.google.com/scholar?q=Employment%20Relations%20and%20IHRM"),
 dict(y="2014", a="David B. Lipsky, Ariel C. Avgar, and J. Ryan Lamare", t="Conflict Resolution in the United States", v="In W. K. Roche, P. Teague, and A. J. S. Colvin, eds., The Oxford Handbook on Conflict Management. Oxford: Oxford University Press.", u="https://doi.org/10.1093/oxfordhb/9780199653676.013.0021"),
 dict(y="2013", a="J. Ryan Lamare, Jonathan Lavelle, Patrick Gunnigle, and Anthony McDonnell", t="Multinational Companies and Trade Union Recognition in Ireland", v="In T. Turner, D. D\u2019Art, and M. O\u2019Sullivan, eds., Are Trade Unions Still Relevant? Union Recognition 100 Years On. Dublin: Orpen Press.", u="https://scholar.google.com/scholar?q=Multinational%20Companies%20and%20Trade%20Union%20Recognition%20in%20Ireland"),
 dict(y="2011", a="J. Ryan Lamare", t="Employees without Protections: The Misclassification of Vulnerable Workers in New York", v="In M. Sargeant and M. Giovannone, eds., Vulnerable Workers \u2014 Safety, Well-Being, and Precarious Work. London: Gower.", u="https://scholar.google.com/scholar?q=Employees%20without%20Protections"),
 dict(y="2011", a="Mark Boocock, Zeenie Hannif, Suzanne Jamieson, J. Ryan Lamare, et al.", t="OHS of Migrant Workers: An International Concern", v="In M. Sargeant and M. Giovannone, eds., Vulnerable Workers \u2014 Safety, Well-Being, and Precarious Work. London: Gower.", u="https://scholar.google.com/scholar?q=OHS%20of%20Migrant%20Workers"),
 dict(y="2011", a="Danae Anderson, J. Ryan Lamare, and Zeenie Hannif", t="The Working Experiences of Student Migrants in Australia and New Zealand", v="In R. Price, P. McDonald, J. Bailey, and B. Pini, eds., Young People at Work. London: Gower.", u="https://scholar.google.com/scholar?q=The%20Working%20Experiences%20of%20Student%20Migrants"),
 dict(y="2009", a="Anthony McDonnell, J. Ryan Lamare, and Jonathan Lavelle", t="Managing Across Borders: Autonomy, Coordination and Control in MNCs", v="In J. Lavelle, A. McDonnell, and P. Gunnigle, eds., Human Resource Practices in Multinational Companies in Ireland. Dublin: Labour Relations Commission.", u="https://scholar.google.com/scholar?q=Managing%20Across%20Borders%20MNCs"),
 dict(y="2009", a="Felicity Lamm, Gaye Greenwood, J. Ryan Lamare, and Barry Foster", t="Bargaining, Negotiation and the Resolution of Conflict", v="In E. Rasmussen, Employment Relations in New Zealand (2nd ed.). Auckland: Pearson.", u="https://scholar.google.com/scholar?q=Bargaining%20Negotiation%20Resolution%20of%20Conflict%20Rasmussen"),
]

REPORTS = [
 dict(y="2026", a="J. Ryan Lamare and Margaret Huizinga", t="Entry: Organized Labor", v="In Encyclopedia of International Human Resource Management and Global Talent Management (accepted)."),
 dict(y="2026", a="J. Ryan Lamare and Margaret Huizinga", t="Entry: International Labour Organization (ILO)", v="In Encyclopedia of International Human Resource Management and Global Talent Management (accepted)."),
 dict(y="2021", a="J. Ryan Lamare", t="Book review: McKersie, R. B. (2018), A Field in Flux: Sixty Years of Industrial Relations", v="Work and Occupations 48(4): 502\u2013504.", u="https://doi.org/10.1177/07308884211008208"),
 dict(y="2014", a="David B. Lipsky, J. Ryan Lamare, and Michael D. Maffie", t="Mandatory Employment Arbitration: Dispelling the Myths", v="Alternatives to the High Cost of Litigation 32(9): 133\u2013146.", u="https://doi.org/10.1002/alt.21546"),
 dict(y="2014", a="J. Ryan Lamare", t="The Evolution of ADR Systems at Large U.S. Corporations", v="Dispute Resolution Magazine 20(3): 4\u20137."),
 dict(y="2014", a="Felicity Lamm, Nadine McDonnell, and J. Ryan Lamare", t="The Impact of Disasters on Independent Contractors: Victims of Circumstances", v="E-Journal of International and Comparative Labour Studies 3(3): 79\u2013109."),
 dict(y="2013", a="J. Ryan Lamare", t="The Arbitration of Employment Discrimination Cases in the Securities Industry", v="Dispute Resolution Journal 68(1): 97\u2013102."),
 dict(y="2012", a="David Holman, J. Ryan Lamare, Damian Grimshaw, Lynne Holdsworth, and Mick Marchington", t="The Diffusion of \u2018Good\u2019 HR Practices Across the Supply Chain", v="Manchester: ACAS."),
 dict(y="2011", a="Maria Figueroa, Jeff Grabelsky, and J. Ryan Lamare", t="Community Workforce Provisions in Project Labor Agreements: A Tool for Building Middle-Class Careers", v="Ithaca, NY: Cornell University ILR School."),
 dict(y="2011", a="John Logan, Erin Johansson, and J. Ryan Lamare", t="New Data: NLRB Process Fails to Ensure a Fair Vote", v="Berkeley, CA: UC Berkeley Center for Labor Research and Education."),
 dict(y="2010", a="David B. Lipsky, Ronald L. Seeber, and J. Ryan Lamare", t="Equity and Efficiency in Employment Arbitration: Lessons from FINRA", v="Dispute Resolution Journal."),
 dict(y="2007", a="Fred B. Kotler, J. Ryan Lamare, and Linda H. Donahue", t="The Cost of Worker Misclassification in New York State", v="Ithaca, NY: Cornell University ILR School."),
]

UNDER_REVIEW = [
 ("R&R", 'J. Ryan Lamare, Margaret Huizinga, and Jeffrey Thomas. \u201cEmployment Experience Effects on Socio-Politically Extreme Beliefs: Empirical Evidence from Europe.\u201d 2nd R&R, <i>ILR Review</i>.'),
 ("R&R", 'J. Ryan Lamare and John W. Budd. \u201cThe Role of Political Parties in Shaping Women\u2019s Labor Market Policies and Outcomes: A Longitudinal Analysis of Party Characteristics, Positions, and Effects.\u201d R&R, <i>Industrial Relations</i>.'),
]

WORKING_PAPERS = [
 'Cherise Regier, J. Ryan Lamare, and Faraz Shahidi. \u201cEmployee Voice and Workplace Wellbeing in the Age of AI: Cross-National Empirical Evidence.\u201d To be submitted to <i>ILR Review</i>.',
 'Giorgos Galanis, J. Ryan Lamare, and Christian R. Proa\u00f1o. \u201cMultiplicity, Distance and Unionisation.\u201d',
]

GRANTS = [
 ("2026", "National Academy of Arbitrators \u2014 British employment tribunal effectiveness and fairness in resolving public disputes (with William Fleming)."),
 ("2020", "National Academy of Arbitrators \u2014 seed grant for research on workplace conflict management."),
 ("2019", "Cornell Center for Advanced Human Resource Studies \u2014 organizational conflict management strategies at Fortune 1000 firms (with Ariel C. Avgar and David B. Lipsky)."),
 ("2019", "National Academy of Arbitrators \u2014 organizational conflict management strategies at Fortune 1000 firms (with Ariel C. Avgar and David B. Lipsky)."),
 ("2014", "Center for Global Studies, Pennsylvania State University \u2014 cross-national comparisons of ADR systems at large U.K. and U.S. corporations."),
 ("2013", "Searle Civil Justice Institute, Law & Economics Center, George Mason University School of Law \u2014 employment arbitration in the securities industry (with David B. Lipsky)."),
 ("2011", "Fairness at Work Pilot Project \u2014 diffusion of HR practices across supply chains (with Damian Grimshaw, David Holman, Mick Marchington, and Jill Rubery)."),
 ("2010", "ACAS Research Partnership \u2014 diffusion of HR practices across supply chains (with Grimshaw, Holman, Marchington, and Rubery)."),
 ("2008", "Seed Funding Research Grant \u2014 governance structures and multinational companies (with Jonathan Lavelle)."),
]

KEYNOTES = [("2024", "\u201cIndustrial Relations Research in the Era of Crises: Rethinking How Unions and Politics Interact.\u201d BUIRA keynote address.")]

INVITED = [
 ("2022", "\u201cAn Empirical Analysis of Race and Political Partisanship Effects on Workplace Mobility Outcomes during COVID-19.\u201d IRRU, Warwick Business School."),
 ("2021", "\u201cLeveraging ADR to Deliver on Strategic Goals in Organizations: Evidence and Applications from the U.S.\u201d PrOPEL Hub masterclass (Strathclyde, Sheffield, and CIPD)."),
 ("2019", "\u201cAn Empirical Assessment of Employment Arbitration Agreements.\u201d Invited panel discussant, George Mason University."),
 ("2018", "\u201cVulnerability, Immigration, and Political Participation: Empirical Evidence from California.\u201d University of Illinois Urbana-Champaign."),
 ("2014", "\u201cThe Strategic Underpinnings of Conflict Management in U.S. Corporations.\u201d Sheffield University; Pennsylvania State University."),
 ("2013", "\u201cResolving Discrimination Complaints in Employment Arbitration.\u201d George Mason University."),
 ("2013", "\u201cLiving with ADR: Evolving Perceptions and Use of Mediation, Arbitration and Conflict Management in Fortune 1,000 Corporations.\u201d Yale University."),
 ("2012", "\u201cThe Effects of Gender and Repetition on Securities Industry Employment Arbitration Awards.\u201d American Rights at Work."),
 ("2011", "\u201cEmployee Representation, Multinational Companies and Institutional Context.\u201d Pennsylvania State University."),
 ("2010", "\u201cThe Industrial Relations System in the United States.\u201d Trinity College Dublin."),
 ("2008", "\u201cUnion Mobilization and Voter Turnout in Los Angeles.\u201d Cornell University."),
]

PRESENTATIONS = [
 ("2026", "AI and Voice at Work", "ILR Review conference honoring Harry C. Katz; LERA."),
 ("2026", "The Role of Political Parties in Shaping Women\u2019s Labor Market Policies and Outcomes: A Longitudinal Analysis of Party Characteristics, Positions, and Effects", "LERA; LSE ERHR seminar."),
 ("2024", "Employment Experience Effects on Socio-Politically Extreme Beliefs: Empirical Evidence from Europe", "ESA; BUIRA; LERA."),
 ("2022", "An Empirical Analysis of Race and Political Partisanship Effects on Workplace Mobility Outcomes during COVID-19", "AIRAANZ; LERA."),
]

# ---- HTML assembly ----------------------------------------------------------
def rows_pub(lst, kind="journal"): return "\n".join(pub(e, kind) for e in lst)
def rows_simple(lst): return "\n".join(simple(y, esc(b)) for y, b in lst)

def pres_rows():
    return "\n".join(simple(y, f'{LDQ}{esc(t)}{RDQ}. {esc(v)}') for y, t, v in PRESENTATIONS)

CSS = """
/* NOTE: the `ital,wght@0,...;1,...` syntax loads Archivo's ITALIC faces too.
   Without the `1,` (italic) entries, <i> text renders upright. */
@import url('https://fonts.googleapis.com/css2?family=Archivo:ital,wght@0,400;0,500;0,600;0,700;0,900;1,400;1,500;1,600&family=IBM+Plex+Mono:wght@400;500&display=swap');
:root{ --ink:#1c1c1c; --soft:#7a7a7a; --rule:#d9d9d9; --accent:#e0112b; }
@page{
  size:A4; margin:13mm 16mm 15mm 16mm;
  @bottom-left{ content:"J. Ryan Lamare \\00B7 Curriculum Vitae"; font-family:'IBM Plex Mono'; font-size:7.5pt; color:#9a9a9a; }
  @bottom-right{ content:counter(page) " / " counter(pages); font-family:'IBM Plex Mono'; font-size:7.5pt; color:#9a9a9a; }
}
*{ box-sizing:border-box; }
body{ font-family:'Archivo',system-ui,sans-serif; font-size:9.3pt; line-height:1.4; color:var(--ink); margin:0; }
a{ color:inherit; text-decoration:none; }
/* header */
.head{ display:flex; justify-content:space-between; align-items:flex-end; padding-bottom:3pt; }
/* red underline under the NAME; padding-right lets it spill a little past the text */
.name{ font-family:'Archivo'; font-weight:900; font-size:25pt; letter-spacing:.005em; text-transform:uppercase; line-height:.95;
       display:inline-block; border-bottom:3pt solid var(--accent); padding-bottom:6pt; padding-right:30pt; }
.updated{ font-family:'Archivo'; font-weight:500; font-size:8pt; letter-spacing:.08em; text-transform:uppercase; color:var(--soft); white-space:nowrap; padding-bottom:3pt; }
.role{ font-weight:600; font-size:11pt; margin-top:7pt; }
.dept{ color:var(--soft); font-size:9.5pt; margin-top:1pt; }
.contact{ font-family:'Archivo'; font-size:8.8pt; letter-spacing:0; color:var(--ink); margin-top:5pt; line-height:1.3; }
.contact a{ border-bottom:.4pt solid transparent; }
/* section headers */
h2{ font-family:'IBM Plex Mono'; font-size:8.2pt; font-weight:500; letter-spacing:.16em; text-transform:uppercase;
    color:var(--ink); margin:11pt 0 5pt; padding-bottom:3pt; border-bottom:.6pt solid var(--rule);
    display:flex; align-items:center; gap:7pt; }
h2::before{ content:""; width:6pt; height:6pt; background:var(--accent); display:inline-block; flex:0 0 auto; }
h3{ font-family:'IBM Plex Mono'; font-size:7.2pt; font-weight:500; letter-spacing:.15em; text-transform:uppercase;
    color:var(--soft); margin:8pt 0 3pt; }
/* rows */
.row{ display:flex; gap:9pt; margin:0 0 3pt; }
.row:first-of-type{ margin-top:0; }
.yr{ font-family:'IBM Plex Mono'; font-size:7.8pt; color:var(--soft); flex:0 0 5.5em; min-width:0; padding-top:1.4pt; white-space:nowrap; }
.it{ flex:1; }
.it .me{ font-weight:700; }
.tag{ font-family:'IBM Plex Mono'; font-size:7.8pt; color:var(--accent); flex:0 0 3.7em; padding-top:1.4pt; }
/* presentations */
.pres{ margin:0 0 4pt; }
.pres-t{ }
.pres-v{ font-family:'IBM Plex Mono'; font-size:7.6pt; color:var(--soft); margin-top:.5pt; }
/* inline list (reviewer, associations) */
.inline{ }
.note{ color:var(--soft); font-size:8.4pt; margin-top:2pt; }
/* education: each cell = year-column width (5.5em@7.8pt + 9pt gap = 51.9pt),
   so every year-to-degree gap matches 2008 -> PhD exactly */
.ecell{ display:inline-block; width:51.9pt; }
.eyr{ font-family:'IBM Plex Mono'; font-size:7.8pt; color:var(--soft); }
h2, h3, .row, .pres{ break-inside:avoid; }
"""

def build():
    P = []
    P.append("<!doctype html><html lang='en'><head><meta charset='utf-8'>")
    P.append("<title>J. Ryan Lamare — Curriculum Vitae</title>")
    P.append("<!-- EDIT TIP: this is the editable CV source. To change any text, search for the")
    P.append("     visible words and edit between the tags. Render to PDF with:")
    P.append("       weasyprint Lamare-CV-source.html Lamare-CV.pdf   (needs internet for fonts,")
    P.append("       or Archivo *incl. its Italic faces* + IBM Plex Mono installed locally;")
    P.append("       without a real Archivo Italic, journal titles render upright). -->")
    P.append(f"<style>{CSS}</style></head><body>")

    # Header
    P.append('<div class="head"><div class="name">J. Ryan Lamare</div>'
             '<div class="updated">Updated June 2026</div></div>')
    P.append('<div class="role">Professor of Employment Relations and Human Resource Management</div>')
    P.append('<div class="dept">Department of Management, London School of Economics and Political Science</div>')
    P.append('<div class="contact">'
             '<a href="mailto:r.lamare@lse.ac.uk">r.lamare@lse.ac.uk</a> \u00b7 '
             '<a href="https://ryanlamare.github.io">ryanlamare.github.io</a><br>'
             '<a href="https://orcid.org/0000-0003-4935-2341">ORCID 0000-0003-4935-2341</a> \u00b7 '
             '<a href="https://scholar.google.com/citations?user=tLTPGScAAAAJ">Google Scholar</a> \u00b7 '
             '<a href="https://www.linkedin.com/in/ryanlamare">LinkedIn</a>'
             '</div>')

    # Appointments
    P.append("<h2>Appointments</h2>")
    P.append('<h3>London School of Economics and Political Science \u2014 Department of Management</h3>')
    P.append(simple("2024\u2013", "Professor"))
    P.append(simple("2024\u2013", "Faculty Group Lead, Employment Relations and Human Resource Management"))
    P.append(simple("2024\u2013", "PhD Programme Director"))
    P.append('<h3>Previous Positions</h3>')
    P.append('<div class="note" style="margin:0 0 4pt">University of Illinois Urbana-Champaign \u2014 School of Labor and Employment Relations</div>')
    P.append(simple("2022\u20132024", "Reuben G. Soderstrom International Labor Relations Professor"))
    P.append(simple("2021\u20132022", "Professor"))
    P.append(simple("2017\u20132021", "Associate Professor"))
    P.append(simple("2015\u20132017", "Assistant Professor"))
    P.append('<div class="note" style="margin:5pt 0 4pt">Pennsylvania State University \u2014 School of Labor and Employment Relations</div>')
    P.append(simple("2012\u20132015", "Assistant Professor"))
    P.append('<div class="note" style="margin:5pt 0 4pt">University of Manchester \u2014 People, Management, and Organisations Division</div>')
    P.append(simple("2010\u20132011", "Lecturer (equivalent to Assistant Professor)"))
    P.append('<div class="note" style="margin:5pt 0 4pt">University of Limerick \u2014 Department of Personnel and Employment Relations</div>')
    P.append(simple("2008\u20132010", "Research Scholar"))

    # Education
    P.append("<h2>Education</h2>")
    P.append('<div class="note" style="margin:0 0 4pt">Cornell University \u2014 School of Industrial and Labor Relations</div>')
    P.append('<div class="row"><div class="yr">2008</div><div class="it">'
             '<span class="ecell">PhD</span>'
             '<span class="ecell eyr">2005</span>'
             '<span class="ecell">MS</span>'
             '<span class="ecell eyr">2004</span>'
             '<span>BS</span>'
             '</div></div>')

    # Editorial & advisory (consolidated) -- placed above Honours (more current)
    P.append("<h2>Editorial Positions</h2>")
    P.append(simple("2024\u2013", "Editor-in-Chief, <i>British Journal of Industrial Relations</i>"))
    P.append(simple("2020\u20132024", "Editor-in-Chief, Labor and Employment Relations Association (LERA)"))
    P.append(simple("2022\u20132024", "Associate Editor, <i>Labour and Industry</i>"))
    P.append('<h3>Editorial Advisory Boards</h3>')
    P.append(simple("2022\u2013", "<i>Human Resource Management</i>"))
    P.append(simple("2016\u2013", "<i>Human Resource Management Review</i>"))
    P.append(simple("2014\u2013", "<i>Human Resource Management Journal</i>"))
    P.append('<h3>Special Issue Guest Editor</h3>')
    P.append(simple("2024\u2013", "<i>ILR Review</i> \u2014 political parties, political systems, and industrial relations"))
    P.append(simple("2020\u20132023", "<i>Industrial Relations</i> \u2014 the impacts of COVID-19 on employment relations"))
    P.append(simple("2015\u20132016", "<i>Advances in Industrial and Labor Relations</i> \u2014 conflict management"))

    # Honours
    P.append("<h2>Honours &amp; Awards</h2>")
    P.append(simple("2023", "James G. Scoville Best International/Comparative Industrial Relations Paper (LERA)"))
    P.append(simple("2018", "Luis Aparicio Prize, runner-up (ILERA)"))
    P.append(simple("2015", "John T. Dunlop Outstanding Scholar (LERA)"))
    P.append(simple("2010", "Thomas A. Kochan &amp; Stephen R. Sleigh Best Dissertation, honourable mention (LERA)"))

    # Publications
    P.append('<h2 style="break-before:page">Publications</h2>')
    P.append("<h3>Books</h3>")
    P.append(rows_pub(BOOKS, "book"))
    P.append("<h3>Journal Articles</h3>")
    P.append(rows_pub(ARTICLES, "journal"))
    P.append("<h3>Articles Under Review</h3>")
    P.append("\n".join(f'<div class="row"><div class="yr"></div><div class="it">{body}</div></div>'
                       for tag, body in UNDER_REVIEW))
    P.append("<h3>Working Papers</h3>")
    P.append("\n".join(f'<div class="row"><div class="yr"></div><div class="it">{body}</div></div>'
                       for body in WORKING_PAPERS))
    P.append("<h3>Book Chapters</h3>")
    P.append(rows_pub(CHAPTERS, "chapter"))
    P.append("<h3>Reports, Reviews &amp; Other</h3>")
    P.append(rows_pub(REPORTS, "report"))

    # Grants
    P.append("<h2>Research Grants</h2>")
    P.append(rows_simple(GRANTS))

    # Talks
    P.append("<h2>Keynote &amp; Plenary Addresses</h2>")
    P.append(rows_simple(KEYNOTES))
    P.append("<h2>Invited Talks</h2>")
    P.append(rows_simple(INVITED))

    # Public engagement
    P.append("<h2>Public Engagement &amp; Media</h2>")
    P.append(simple("2024", "\u201cWhat organisations can learn from a Black bus driver in Michigan.\u201d <i>LSE Business Review</i>."))
    P.append(simple("2024", "\u201cRace and Politics in US Crises.\u201d <i>Management With Impact</i> podcast, episode 1."))
    P.append(simple("2020", "Research featured by the University of Illinois News Bureau (also 2018, 2015)."))

    # Teaching
    P.append("<h2>Teaching</h2>")
    P.append('<h3>London School of Economics</h3>')
    P.append('<div class="it">The Management of People in Global Companies \u00b7 Employment Relations and Human Resource Management Seminar \u00b7 A Social Sciences Perspective of Academic Research in Management \u00b7 Advanced Quantitative Analysis for Research in Management</div>')
    P.append('<h3>University of Illinois Urbana-Champaign</h3>')
    P.append('<div class="it">Collective Bargaining \u00b7 Game Theory and HR Strategy \u00b7 Human Resource Management \u00b7 HRM and Strategy \u00b7 Industrial Relations Theory \u00b7 Negotiations \u00b7 Workplace Dispute Resolution</div>')
    P.append('<h3>Pennsylvania State University</h3>')
    P.append('<div class="it">Intro to Employment Relations \u00b7 Seminar in Employment Relations \u00b7 Workplace Dispute Resolution</div>')
    P.append('<h3>University of Manchester</h3>')
    P.append('<div class="it">Human Resource Management \u00b7 International Human Resource Management \u00b7 Strategic Human Resource Management</div>')
    P.append('<h3>Teaching Awards</h3>')
    P.append(simple("2018\u20132022", "LER Faculty Teaching Excellence Award (three times), University of Illinois"))
    P.append(simple("2015\u20132024", "List of Teachers Rated as Excellent, University of Illinois"))

    # Academic visits & non-academic
    P.append("<h2>Non-Academic Positions</h2>")
    P.append(simple("2010\u20132012", "Research Analyst, American Rights at Work"))

    # Service
    P.append("<h2>Service &amp; Professional Activities</h2>")
    P.append('<h3>PhD Supervision</h3>')
    P.append('<div class="it" style="margin-bottom:3pt">Chair: Brandon C. Grant (first position, SUNY Farmingdale) \u00b7 Aibak Hafeez (Cornell University) \u00b7 Weihao Li (IAMAW)</div>')
    P.append('<div class="it" style="margin-bottom:3pt">Committee member: Yin Lee (NEOMA Business School) \u00b7 Ki-Jung Kim (Eastern Kentucky University) \u00b7 Kwon Hee Han (Louisiana State University)</div>')
    P.append('<div class="it">Current: Margaret Huizinga</div>')
    P.append('<h3>Committees \u2014 London School of Economics</h3>')
    P.append('<div class="it">ER/HR Search Committee (2023\u20132024); Macro OB Search Committee (2024)</div>')
    P.append('<h3>Committees \u2014 University of Illinois</h3>')
    P.append('<div class="it">Dean Search Committee (2018\u20132019, 2021\u20132022); IR Search Committee (2018, 2020, chair 2021); Soderstrom Professor Search Committee (chair, 2019); HR/IR Search Committee (2015\u20132016, chair 2023); Executive Committee (2017\u20132020, 2021\u20132024); PhD Advisory Committee (2015\u20132023); MHRIR Admissions (2020\u20132023); Provost\u2019s Labor Advisory Group (2019\u2013); Faculty Senate (2016\u20132017)</div>')
    P.append('<h3>Committees \u2014 Pennsylvania State University</h3>')
    P.append('<div class="it">Undergraduate, Graduate, Search, and Strategic Planning Committees (2012\u20132015)</div>')
    P.append('<h3>Labor and Employment Relations Association</h3>')
    P.append('<div class="it">Nominating Committee Chair (2026); Secretary-Treasurer (2019\u20132020); Editorial Committee Chair (2020\u20132024); Poster Session Chair (2016\u20132019)</div>')
    P.append('<h3>Ad-Hoc Reviewer</h3>')
    P.append('<div class="it">ILR Review \u00b7 Industrial Relations \u00b7 British Journal of Industrial Relations \u00b7 European Journal of Industrial Relations \u00b7 Human Relations \u00b7 Journal of World Business \u00b7 Human Resource Management Journal \u00b7 Journal of Policy Analysis and Management \u00b7 American Political Science Review \u00b7 American Journal of Political Science \u00b7 Nature Human Behaviour; among others</div>')

    P.append("</body></html>")
    return "\n".join(P)

open("/home/claude/Lamare-CV-source.html", "w").write(build())
print("written Lamare-CV-source.html")
