# The Immunity Wars — every factual claim the app makes

**GENERATED FILE — do not edit by hand.** Regenerate with `pnpm medical:review`. A hand edit
here is deleted by the next run, silently ([`FINDINGS.md`](FINDINGS.md) #65). **Reviewer notes
and verdicts belong in [`MEDICAL_REVIEW_GUIDE.md`](MEDICAL_REVIEW_GUIDE.md)**, which is written
by hand and which the generator never touches. What a reviewer receives is the .docx built from
this same data.

Generated 2026-09-09 from `packages/content/src` — pack `immunity-wars-core`, content `1.0.0`, rules `3.1.0`.

**696 claims.** Game mechanics are deliberately excluded: how a disease behaves on
the board, which organs it can reach in play, how many hits it takes, and the four stat bars are
design decisions rather than medical claims, and are not here to be reviewed.

Every claim carries a stable id such as `DISEASE/Rabies/Treat`. Quoting the id is enough for a
correction to be found and applied.

---


## Part 1 — The disease cards

Every word of text the app shows on a disease card. **The two fields to check first are Prevent and Treat**: they are the only place the app comes close to saying what a person should do, they are read by children, and a wrong one is the only kind of error here that could matter outside the game.


### Influenza

| Claim id | Field | What the app says |
|---|---|---|
| `DISEASE/Influenza/Discovered` | Discovered | Virus isolated 1933; the 1918 pandemic killed ~50 million. |
| `DISEASE/Influenza/Causes` | Causes | Fever, aches, cough; can lead to pneumonia and myocarditis. |
| `DISEASE/Influenza/Found` | Found | Worldwide, in yearly winter waves. |
| `DISEASE/Influenza/Prevent` | Prevent | Annual flu vaccine. It changes because the virus mutates fast. |
| `DISEASE/Influenza/Treat` | Treat | Rest, fluids; antivirals for high-risk patients. |
| `DISEASE/Influenza/Fact` | Card fact | Flu mutates fast. Last year's antibodies may not fit. |

### Common cold

| Claim id | Field | What the app says |
|---|---|---|
| `DISEASE/Common cold/Discovered` | Discovered | Rhinovirus identified in the 1950s. |
| `DISEASE/Common cold/Causes` | Causes | Runny nose, sore throat, sneezing. |
| `DISEASE/Common cold/Found` | Found | Everywhere, all year. |
| `DISEASE/Common cold/Prevent` | Prevent | Handwashing. No vaccine. Over 100 strains. |
| `DISEASE/Common cold/Treat` | Treat | No cure; it passes in about a week. |
| `DISEASE/Common cold/Fact` | Card fact | Over 100 strains; no lasting immunity. |

### COVID-19

| Claim id | Field | What the app says |
|---|---|---|
| `DISEASE/COVID-19/Discovered` | Discovered | SARS-CoV-2 identified in Wuhan, China, December 2019. |
| `DISEASE/COVID-19/Causes` | Causes | Cough, fever, loss of smell; pneumonia and myocarditis in severe cases. |
| `DISEASE/COVID-19/Found` | Found | Worldwide pandemic from 2020. |
| `DISEASE/COVID-19/Prevent` | Prevent | Vaccination, ventilation, masks during outbreaks. |
| `DISEASE/COVID-19/Treat` | Treat | Supportive care; antivirals for those at risk. |
| `DISEASE/COVID-19/Fact` | Card fact | Can inflame the heart muscle (myocarditis) as well as the lungs. |

### RSV

| Claim id | Field | What the app says |
|---|---|---|
| `DISEASE/RSV/Discovered` | Discovered | Respiratory syncytial virus, discovered 1956. |
| `DISEASE/RSV/Causes` | Causes | Cold-like illness; bronchiolitis and pneumonia in babies. |
| `DISEASE/RSV/Found` | Found | Worldwide, seasonal. |
| `DISEASE/RSV/Prevent` | Prevent | Monoclonal antibodies and a maternal vaccine for infants. |
| `DISEASE/RSV/Treat` | Treat | Supportive care; oxygen if severe. |
| `DISEASE/RSV/Fact` | Card fact | Mild in adults, dangerous for babies. |

### Measles

| Claim id | Field | What the app says |
|---|---|---|
| `DISEASE/Measles/Discovered` | Discovered | Vaccine by John Enders, 1963. One of the most contagious viruses known. |
| `DISEASE/Measles/Causes` | Causes | Rash and fever. And IMMUNE AMNESIA: it wipes out your existing immune memory, leaving you open to diseases you had already beaten. |
| `DISEASE/Measles/Found` | Found | Worldwide; resurges wherever vaccination drops. |
| `DISEASE/Measles/Prevent` | Prevent | MMR vaccine. Two doses. |
| `DISEASE/Measles/Treat` | Treat | No antiviral; vitamin A and supportive care. Prevention is everything. |

### Mumps

| Claim id | Field | What the app says |
|---|---|---|
| `DISEASE/Mumps/Discovered` | Discovered | Described by Hippocrates; vaccine 1967. |
| `DISEASE/Mumps/Causes` | Causes | Swollen salivary glands; can inflame the brain and testes. |
| `DISEASE/Mumps/Found` | Found | Worldwide. |
| `DISEASE/Mumps/Prevent` | Prevent | MMR vaccine. |
| `DISEASE/Mumps/Treat` | Treat | Supportive care only. |

### Rubella

| Claim id | Field | What the app says |
|---|---|---|
| `DISEASE/Rubella/Discovered` | Discovered | Link to birth defects found by Norman Gregg, 1941. |
| `DISEASE/Rubella/Causes` | Causes | Mild rash in children. But devastating to an unborn baby. |
| `DISEASE/Rubella/Found` | Found | Worldwide. |
| `DISEASE/Rubella/Prevent` | Prevent | MMR vaccine, especially before pregnancy. |
| `DISEASE/Rubella/Treat` | Treat | No cure; prevention protects the next generation. |

### Smallpox

| Claim id | Field | What the app says |
|---|---|---|
| `DISEASE/Smallpox/Discovered` | Discovered | Jenner's cowpox vaccine, 1796. The first vaccine ever made. |
| `DISEASE/Smallpox/Causes` | Causes | Disfiguring pustules; killed around 30% of those infected. |
| `DISEASE/Smallpox/Found` | Found | NOWHERE. Declared eradicated in 1980. The only human disease ever wiped out. |
| `DISEASE/Smallpox/Prevent` | Prevent | Vaccination. The campaign that ended it. |
| `DISEASE/Smallpox/Treat` | Treat | None needed. This card is a trophy: proof that immunology WINS. |

### Nipah

| Claim id | Field | What the app says |
|---|---|---|
| `DISEASE/Nipah/Discovered` | Discovered | Identified in Malaysia 1998; outbreaks in Kerala, India (2018, 2023). |
| `DISEASE/Nipah/Causes` | Causes | Brain inflammation; fatal in 40-75% of cases. |
| `DISEASE/Nipah/Found` | Found | South and Southeast Asia; spread by fruit bats. |
| `DISEASE/Nipah/Prevent` | Prevent | Avoid raw date-palm sap; isolate cases. |
| `DISEASE/Nipah/Treat` | Treat | No specific cure. Supportive care. |

### Hand-foot-and-mouth

| Claim id | Field | What the app says |
|---|---|---|
| `DISEASE/Hand-foot-and-mouth/Discovered` | Discovered | Coxsackievirus, 1950s. |
| `DISEASE/Hand-foot-and-mouth/Causes` | Causes | Blisters on hands, feet and mouth; usually mild in children. |
| `DISEASE/Hand-foot-and-mouth/Found` | Found | Worldwide; common in schools. |
| `DISEASE/Hand-foot-and-mouth/Prevent` | Prevent | Handwashing. |
| `DISEASE/Hand-foot-and-mouth/Treat` | Treat | Self-limiting. |

### Chickenpox

| Claim id | Field | What the app says |
|---|---|---|
| `DISEASE/Chickenpox/Discovered` | Discovered | Varicella-zoster; vaccine developed in the 1970s. |
| `DISEASE/Chickenpox/Causes` | Causes | Itchy blisters. Then HIDES IN YOUR NERVES for decades and can return as shingles. |
| `DISEASE/Chickenpox/Found` | Found | Worldwide. |
| `DISEASE/Chickenpox/Prevent` | Prevent | Varicella vaccine. |
| `DISEASE/Chickenpox/Treat` | Treat | Antivirals if severe. |
| `DISEASE/Chickenpox/Fact` | Card fact | Hides in nerves for decades. Returns as shingles. |

### Glandular fever

| Claim id | Field | What the app says |
|---|---|---|
| `DISEASE/Glandular fever/Discovered` | Discovered | Epstein-Barr virus, discovered 1964. |
| `DISEASE/Glandular fever/Causes` | Causes | Fever, sore throat, extreme fatigue, swollen spleen (rupture risk). |
| `DISEASE/Glandular fever/Found` | Found | Worldwide; common in teenagers. |
| `DISEASE/Glandular fever/Prevent` | Prevent | No vaccine. |
| `DISEASE/Glandular fever/Treat` | Treat | Rest. Avoid contact sport while the spleen is swollen. |
| `DISEASE/Glandular fever/Fact` | Card fact | Hides inside your own B-cells; risks spleen rupture. |

### Cytomegalovirus

| Claim id | Field | What the app says |
|---|---|---|
| `DISEASE/Cytomegalovirus/Discovered` | Discovered | Isolated 1956. |
| `DISEASE/Cytomegalovirus/Causes` | Causes | Harmless in healthy people. It just hides for life. Dangerous to babies and the immunosuppressed. |
| `DISEASE/Cytomegalovirus/Found` | Found | Most adults worldwide carry it. |
| `DISEASE/Cytomegalovirus/Prevent` | Prevent | Hygiene; no vaccine yet. |
| `DISEASE/Cytomegalovirus/Treat` | Treat | Antivirals only when it reactivates. |

### Tuberculosis

| Claim id | Field | What the app says |
|---|---|---|
| `DISEASE/Tuberculosis/Discovered` | Discovered | Bacterium found by Robert Koch, 1882. |
| `DISEASE/Tuberculosis/Causes` | Causes | Chronic cough, weight loss, night sweats. Can lie dormant for YEARS. |
| `DISEASE/Tuberculosis/Found` | Found | Worldwide. India carries the largest burden of any country. |
| `DISEASE/Tuberculosis/Prevent` | Prevent | BCG vaccine; treating active cases; ventilation. |
| `DISEASE/Tuberculosis/Treat` | Treat | 6+ months of combination antibiotics. Not finishing the course breeds resistance. |
| `DISEASE/Tuberculosis/Fact` | Card fact | Can lie dormant in the lungs for years. |

### Whooping cough

| Claim id | Field | What the app says |
|---|---|---|
| `DISEASE/Whooping cough/Discovered` | Discovered | Bordetella pertussis, identified 1906. |
| `DISEASE/Whooping cough/Causes` | Causes | Violent coughing fits with a 'whoop'; deadly in babies. |
| `DISEASE/Whooping cough/Found` | Found | Worldwide; returns where vaccination falls. |
| `DISEASE/Whooping cough/Prevent` | Prevent | DPT vaccine. |
| `DISEASE/Whooping cough/Treat` | Treat | Antibiotics, given early. |
| `DISEASE/Whooping cough/Fact` | Card fact | Violent coughing fits; DPT vaccine prevents it. |

### Meningitis

| Claim id | Field | What the app says |
|---|---|---|
| `DISEASE/Meningitis/Discovered` | Discovered | Meningococcus identified 1887. |
| `DISEASE/Meningitis/Causes` | Causes | Infects the lining of the brain. Can kill a healthy person within HOURS. |
| `DISEASE/Meningitis/Found` | Found | Worldwide; the African 'meningitis belt' worst. |
| `DISEASE/Meningitis/Prevent` | Prevent | Meningococcal vaccine. |
| `DISEASE/Meningitis/Treat` | Treat | Emergency antibiotics. Every hour counts. |

### Pneumonia

| Claim id | Field | What the app says |
|---|---|---|
| `DISEASE/Pneumonia/Discovered` | Discovered | Streptococcus pneumoniae, identified 1881. |
| `DISEASE/Pneumonia/Causes` | Causes | Fills the lungs with fluid. The single biggest infectious killer of children worldwide. |
| `DISEASE/Pneumonia/Found` | Found | Everywhere. |
| `DISEASE/Pneumonia/Prevent` | Prevent | Pneumococcal vaccine; flu vaccine; clean cooking fuel. |
| `DISEASE/Pneumonia/Treat` | Treat | Antibiotics and oxygen. |

### Strep throat

| Claim id | Field | What the app says |
|---|---|---|
| `DISEASE/Strep throat/Discovered` | Discovered | Group A Streptococcus. |
| `DISEASE/Strep throat/Causes` | Causes | Sore throat. But if ignored, the antibodies you make against it can attack YOUR OWN HEART VALVES (rheumatic fever). |
| `DISEASE/Strep throat/Found` | Found | Worldwide; rheumatic heart disease is a major problem in India. |
| `DISEASE/Strep throat/Prevent` | Prevent | Treat sore throats properly. |
| `DISEASE/Strep throat/Treat` | Treat | Antibiotics. Which are given mainly to prevent the heart damage. |

### Leprosy

| Claim id | Field | What the app says |
|---|---|---|
| `DISEASE/Leprosy/Discovered` | Discovered | Bacterium found by Gerhard Hansen, 1873. The first bacterium ever linked to human disease. |
| `DISEASE/Leprosy/Causes` | Causes | Attacks the nerves. Numbness means injuries go unnoticed, and THAT causes the deformity. Not the germ eating the flesh, as people wrongly believe. |
| `DISEASE/Leprosy/Found` | Found | India records a large share of the world's new cases. |
| `DISEASE/Leprosy/Prevent` | Prevent | IT IS NOT SPREAD BY TOUCH. It spreads by droplets, after months of close contact, and about 95% of people are naturally immune to it. It enters through the NOSE, which is why it is in the Nose lane and not the Contact lane. The belief that a handshake spreads leprosy is a myth that exiled people to colonies for centuries. |
| `DISEASE/Leprosy/Treat` | Treat | Completely curable with multi-drug therapy. Free worldwide since 1995. |

### Legionnaires' disease

| Claim id | Field | What the app says |
|---|---|---|
| `DISEASE/Legionnaires' disease/Discovered` | Discovered | Named after a 1976 outbreak at an American Legion convention. |
| `DISEASE/Legionnaires' disease/Causes` | Causes | Severe pneumonia from bacteria in air-conditioning and water systems. |
| `DISEASE/Legionnaires' disease/Found` | Found | Worldwide, in buildings with poorly maintained water systems. |
| `DISEASE/Legionnaires' disease/Prevent` | Prevent | Maintain cooling towers and water tanks. |
| `DISEASE/Legionnaires' disease/Treat` | Treat | Antibiotics. |

### Diphtheria

| Claim id | Field | What the app says |
|---|---|---|
| `DISEASE/Diphtheria/Discovered` | Discovered | Antitoxin by von Behring, 1890. Winning the FIRST Nobel Prize in Medicine. |
| `DISEASE/Diphtheria/Causes` | Causes | A grey membrane chokes the throat, and its TOXIN attacks the heart. The toxin is pre-formed. It poisons you directly. |
| `DISEASE/Diphtheria/Found` | Found | Worldwide where vaccination lapses; outbreaks still occur in India. |
| `DISEASE/Diphtheria/Prevent` | Prevent | DPT vaccine. |
| `DISEASE/Diphtheria/Treat` | Treat | ANTITOXIN. Antibodies. No cell can eat a toxin. |

### Mucormycosis

| Claim id | Field | What the app says |
|---|---|---|
| `DISEASE/Mucormycosis/Discovered` | Discovered | 'Black fungus'. Surged across India in 2021 among COVID patients. |
| `DISEASE/Mucormycosis/Causes` | Causes | Invades nose and sinuses, then the eye and BRAIN. Often fatal. |
| `DISEASE/Mucormycosis/Found` | Found | Worldwide, but it strikes the immunocompromised. Diabetics, steroid patients. |
| `DISEASE/Mucormycosis/Prevent` | Prevent | Control diabetes; use steroids carefully. |
| `DISEASE/Mucormycosis/Treat` | Treat | Antifungals and surgery. A pure OPPORTUNIST. It only wins when your defences are already down. |

### Aspergillosis

| Claim id | Field | What the app says |
|---|---|---|
| `DISEASE/Aspergillosis/Discovered` | Discovered | Aspergillus mould, described 1729. |
| `DISEASE/Aspergillosis/Causes` | Causes | A mould you breathe in daily. Harmless, unless your defences are weak. |
| `DISEASE/Aspergillosis/Found` | Found | Everywhere: soil, dust, damp buildings. |
| `DISEASE/Aspergillosis/Prevent` | Prevent | Avoid dust if immunocompromised. |
| `DISEASE/Aspergillosis/Treat` | Treat | Antifungals. Neutrophils are the key defence. Which is why neutropenia invites it in. |

### Cryptococcus

| Claim id | Field | What the app says |
|---|---|---|
| `DISEASE/Cryptococcus/Discovered` | Discovered | Described 1894; a leading killer in AIDS. |
| `DISEASE/Cryptococcus/Causes` | Causes | Fungal meningitis. It invades the BRAIN. |
| `DISEASE/Cryptococcus/Found` | Found | Worldwide, in soil and pigeon droppings. |
| `DISEASE/Cryptococcus/Prevent` | Prevent | Hard to avoid; the real defence is a working immune system. |
| `DISEASE/Cryptococcus/Treat` | Treat | Antifungals. Mostly attacks people with HIV. |

### Pneumocystis pneumonia

| Claim id | Field | What the app says |
|---|---|---|
| `DISEASE/Pneumocystis pneumonia/Discovered` | Discovered | Recognised in the 1980s as the disease that revealed AIDS. |
| `DISEASE/Pneumocystis pneumonia/Causes` | Causes | A fungus that only causes pneumonia when helper T-cells are destroyed. |
| `DISEASE/Pneumocystis pneumonia/Found` | Found | Worldwide, in the severely immunosuppressed. |
| `DISEASE/Pneumocystis pneumonia/Prevent` | Prevent | Preventive antibiotics for at-risk patients. |
| `DISEASE/Pneumocystis pneumonia/Treat` | Treat | Antibiotics/antifungals. It is a signpost of a collapsed immune system. |

### Dengue

| Claim id | Field | What the app says |
|---|---|---|
| `DISEASE/Dengue/Discovered` | Discovered | Four different serotypes. This matters enormously. |
| `DISEASE/Dengue/Causes` | Causes | High fever, severe joint pain, crashing platelets (marrow). |
| `DISEASE/Dengue/Found` | Found | Tropics; a major monsoon disease across India. |
| `DISEASE/Dengue/Prevent` | Prevent | Aedes mosquito control. It bites in DAYTIME. Remove standing water. |
| `DISEASE/Dengue/Treat` | Treat | No cure; fluids. Never give aspirin. A SECOND dengue infection can be far worse (ADE). |
| `DISEASE/Dengue/Fact` | Card fact | Crashes the marrow's platelet supply. |

### Chikungunya

| Claim id | Field | What the app says |
|---|---|---|
| `DISEASE/Chikungunya/Discovered` | Discovered | First described in Tanzania, 1952. The name means 'to become contorted'. |
| `DISEASE/Chikungunya/Causes` | Causes | Fever and severe joint pain that can last months. |
| `DISEASE/Chikungunya/Found` | Found | Africa, Asia, the Americas; common in India. |
| `DISEASE/Chikungunya/Prevent` | Prevent | Aedes mosquito control. |
| `DISEASE/Chikungunya/Treat` | Treat | No antiviral; pain relief. |
| `DISEASE/Chikungunya/Fact` | Card fact | Mosquito virus; joint pain, sometimes myocarditis. |

### Japanese encephalitis

| Claim id | Field | What the app says |
|---|---|---|
| `DISEASE/Japanese encephalitis/Discovered` | Discovered | Virus isolated in Japan, 1935. |
| `DISEASE/Japanese encephalitis/Causes` | Causes | Brain inflammation; often leaves permanent damage. |
| `DISEASE/Japanese encephalitis/Found` | Found | Rural Asia including India; pigs and birds are the reservoir. |
| `DISEASE/Japanese encephalitis/Prevent` | Prevent | JE vaccine; mosquito control. |
| `DISEASE/Japanese encephalitis/Treat` | Treat | No cure. Supportive care only. |
| `DISEASE/Japanese encephalitis/Fact` | Card fact | Mosquito-borne brain infection; vaccine-preventable. |

### Yellow fever

| Claim id | Field | What the app says |
|---|---|---|
| `DISEASE/Yellow fever/Discovered` | Discovered | Shown to be mosquito-borne by Walter Reed, 1900. |
| `DISEASE/Yellow fever/Causes` | Causes | Fever, liver failure and jaundice (the 'yellow'), bleeding. |
| `DISEASE/Yellow fever/Found` | Found | Africa and South America. |
| `DISEASE/Yellow fever/Prevent` | Prevent | One highly effective, lifelong vaccine. |
| `DISEASE/Yellow fever/Treat` | Treat | Supportive care. |
| `DISEASE/Yellow fever/Fact` | Card fact | Attacks the liver. Hence the jaundice. |

### Zika

| Claim id | Field | What the app says |
|---|---|---|
| `DISEASE/Zika/Discovered` | Discovered | Identified 1947; caused a global emergency in 2015-16. |
| `DISEASE/Zika/Causes` | Causes | Mild in adults. But causes severe brain defects in unborn babies. |
| `DISEASE/Zika/Found` | Found | Tropics. |
| `DISEASE/Zika/Prevent` | Prevent | Mosquito control; protect pregnancies. |
| `DISEASE/Zika/Treat` | Treat | No specific treatment. |

### West Nile fever

| Claim id | Field | What the app says |
|---|---|---|
| `DISEASE/West Nile fever/Discovered` | Discovered | Isolated in Uganda, 1937. |
| `DISEASE/West Nile fever/Causes` | Causes | Usually mild; occasionally causes brain inflammation. |
| `DISEASE/West Nile fever/Found` | Found | Africa, Europe, Americas, Asia. |
| `DISEASE/West Nile fever/Prevent` | Prevent | Mosquito control. |
| `DISEASE/West Nile fever/Treat` | Treat | Supportive care. |

### Rabies

| Claim id | Field | What the app says |
|---|---|---|
| `DISEASE/Rabies/Discovered` | Discovered | Vaccine by Louis Pasteur, 1885. |
| `DISEASE/Rabies/Causes` | Causes | Creeps up your NERVES to the brain, where antibodies cannot follow. Almost 100% fatal once symptoms begin. |
| `DISEASE/Rabies/Found` | Found | Worldwide; dogs are the main source in India. |
| `DISEASE/Rabies/Prevent` | Prevent | Vaccinate dogs. After a bite: wash it, and get the vaccine IMMEDIATELY. |
| `DISEASE/Rabies/Treat` | Treat | Post-exposure vaccine works BEFORE symptoms start. After that, nothing does. |
| `DISEASE/Rabies/Fact` | Card fact | Creeps inside nerves where antibodies can't follow. |

### HIV

| Claim id | Field | What the app says |
|---|---|---|
| `DISEASE/HIV/Discovered` | Discovered | Identified 1983 by Montagnier and Barré-Sinoussi (Nobel Prize). |
| `DISEASE/HIV/Causes` | Causes | It destroys HELPER T-CELLS. The commanders of your immune system. Without them, ordinary germs become lethal. |
| `DISEASE/HIV/Found` | Found | Worldwide; ~39 million people live with HIV. Spread by unprotected sex, shared needles, and infected blood. |
| `DISEASE/HIV/Prevent` | Prevent | Condoms; never share needles; screened blood; PrEP medication. It is NOT spread by mosquitoes, sharing food, or touching. A myth worth killing. |
| `DISEASE/HIV/Treat` | Treat | Antiretroviral therapy: not a cure, but people now live full lives, and treatment makes them unable to pass it on. Attacking the immune system itself is why HIV is so dangerous. |

### Hepatitis B

| Claim id | Field | What the app says |
|---|---|---|
| `DISEASE/Hepatitis B/Discovered` | Discovered | Discovered by Baruch Blumberg, 1965 (Nobel Prize). First anti-cancer vaccine. |
| `DISEASE/Hepatitis B/Causes` | Causes | Attacks the liver; can persist for life and cause liver cancer. |
| `DISEASE/Hepatitis B/Found` | Found | Worldwide; ~250 million chronic carriers. |
| `DISEASE/Hepatitis B/Prevent` | Prevent | Hepatitis B vaccine. Given at birth in India. |
| `DISEASE/Hepatitis B/Treat` | Treat | Antivirals control it; the vaccine prevents it. |

### Hepatitis C

| Claim id | Field | What the app says |
|---|---|---|
| `DISEASE/Hepatitis C/Discovered` | Discovered | Identified 1989; Nobel Prize 2020. |
| `DISEASE/Hepatitis C/Causes` | Causes | Silently scars the liver for decades. Cirrhosis and cancer. |
| `DISEASE/Hepatitis C/Found` | Found | Worldwide. |
| `DISEASE/Hepatitis C/Prevent` | Prevent | No vaccine yet; screened blood and clean needles. |
| `DISEASE/Hepatitis C/Treat` | Treat | CURABLE since 2014 with direct-acting antivirals. One of medicine's great wins. |

### Chagas disease

| Claim id | Field | What the app says |
|---|---|---|
| `DISEASE/Chagas disease/Discovered` | Discovered | Discovered by Carlos Chagas, 1909. He found the parasite, the vector and the disease. |
| `DISEASE/Chagas disease/Causes` | Causes | A parasite that HIDES INSIDE HEART MUSCLE for decades, then destroys it. |
| `DISEASE/Chagas disease/Found` | Found | Latin America. |
| `DISEASE/Chagas disease/Prevent` | Prevent | Control the 'kissing bug'; improve housing. |
| `DISEASE/Chagas disease/Treat` | Treat | Drugs work early; once the heart is damaged, it is irreversible. |

### Lyme disease

| Claim id | Field | What the app says |
|---|---|---|
| `DISEASE/Lyme disease/Discovered` | Discovered | Identified in Lyme, Connecticut, 1975. |
| `DISEASE/Lyme disease/Causes` | Causes | Bull's-eye rash; can attack the heart (Lyme carditis) and nerves. |
| `DISEASE/Lyme disease/Found` | Found | North America, Europe, parts of Asia. From tick bites. |
| `DISEASE/Lyme disease/Prevent` | Prevent | Cover skin in woods; remove ticks quickly. |
| `DISEASE/Lyme disease/Treat` | Treat | Antibiotics. Very effective if caught early. |
| `DISEASE/Lyme disease/Fact` | Card fact | Tick bite; can cause Lyme carditis in the heart. |

### Plague

| Claim id | Field | What the app says |
|---|---|---|
| `DISEASE/Plague/Discovered` | Discovered | Yersinia pestis. The Black Death killed a third of Europe (1347-51). |
| `DISEASE/Plague/Causes` | Causes | Swollen lymph nodes ('buboes'); the lung form spreads person to person and kills fast. |
| `DISEASE/Plague/Found` | Found | Rare now; pockets in Africa, Asia, the Americas. |
| `DISEASE/Plague/Prevent` | Prevent | Rodent and flea control. |
| `DISEASE/Plague/Treat` | Treat | Curable with prompt antibiotics. |
| `DISEASE/Plague/Fact` | Card fact | Flea bites. The historical Black Death. |

### Scrub typhus

| Claim id | Field | What the app says |
|---|---|---|
| `DISEASE/Scrub typhus/Discovered` | Discovered | Recognised in Asia; a major cause of fever in India. |
| `DISEASE/Scrub typhus/Causes` | Causes | Fever with a black scab at the mite bite; can cause pneumonia and brain inflammation. |
| `DISEASE/Scrub typhus/Found` | Found | The 'tsutsugamushi triangle'. Including India. |
| `DISEASE/Scrub typhus/Prevent` | Prevent | Avoid mite-infested scrub; protective clothing. |
| `DISEASE/Scrub typhus/Treat` | Treat | Doxycycline. Cheap and highly effective. |

### Malaria

| Claim id | Field | What the app says |
|---|---|---|
| `DISEASE/Malaria/Discovered` | Discovered | Ronald Ross proved mosquitoes carry it. In Secunderabad, INDIA, 1897. Nobel Prize. |
| `DISEASE/Malaria/Causes` | Causes | Bite → LIVER (hides inside liver cells) → bursts into blood → fever cycles, anaemia, cerebral malaria. |
| `DISEASE/Malaria/Found` | Found | Tropics; still a major disease in India. |
| `DISEASE/Malaria/Prevent` | Prevent | Nets, repellents, draining standing water. |
| `DISEASE/Malaria/Treat` | Treat | Antimalarials. P. vivax needs a SECOND drug to clear the liver. Or it relapses months later. |

### Malaria (blood)

| Claim id | Field | What the app says |
|---|---|---|
| `DISEASE/Malaria (blood)/Discovered` | Discovered | The blood stage. Merozoites bursting out of the liver. |
| `DISEASE/Malaria (blood)/Causes` | Causes | Invades red blood cells; causes the classic fever cycles. |
| `DISEASE/Malaria (blood)/Found` | Found | Tropics. |
| `DISEASE/Malaria (blood)/Prevent` | Prevent | Mosquito control. |
| `DISEASE/Malaria (blood)/Treat` | Treat | NOW antibodies and phagocytes can reach it. This is the stage you can actually fight. |

### Kala-azar

| Claim id | Field | What the app says |
|---|---|---|
| `DISEASE/Kala-azar/Discovered` | Discovered | Visceral leishmaniasis. Sir Upendranath Brahmachari developed the first cure. In India, 1920. |
| `DISEASE/Kala-azar/Causes` | Causes | HIDES INSIDE YOUR MACROPHAGES. It turns your own defender cell into its home. Destroys the spleen; fatal untreated. |
| `DISEASE/Kala-azar/Found` | Found | Bihar, India, has historically carried a large share of the world's cases. |
| `DISEASE/Kala-azar/Prevent` | Prevent | Sandfly control; indoor spraying. |
| `DISEASE/Kala-azar/Treat` | Treat | Liposomal amphotericin B. India has driven cases down dramatically. |

### Sleeping sickness

| Claim id | Field | What the app says |
|---|---|---|
| `DISEASE/Sleeping sickness/Discovered` | Discovered | African trypanosomiasis; the parasite was found in 1901. |
| `DISEASE/Sleeping sickness/Causes` | Causes | ANTIGENIC VARIATION. It keeps changing its coat, so your antibodies never quite fit. Eventually invades the brain. |
| `DISEASE/Sleeping sickness/Found` | Found | Sub-Saharan Africa; spread by the tsetse fly. |
| `DISEASE/Sleeping sickness/Prevent` | Prevent | Vector control. |
| `DISEASE/Sleeping sickness/Treat` | Treat | Drugs exist, and cases have collapsed. Its trick. Changing disguise. Is why a vaccine is so hard. |

### Filariasis

| Claim id | Field | What the app says |
|---|---|---|
| `DISEASE/Filariasis/Discovered` | Discovered | Elephantiasis; the worm was found by Patrick Manson, 1877. |
| `DISEASE/Filariasis/Causes` | Causes | Adult worms BLOCK YOUR LYMPHATIC VESSELS. Fluid cannot drain, and limbs swell enormously. |
| `DISEASE/Filariasis/Found` | Found | Tropics; India has run one of the world's largest elimination programmes. |
| `DISEASE/Filariasis/Prevent` | Prevent | Mass drug administration; mosquito control. |
| `DISEASE/Filariasis/Treat` | Treat | Antiparasitic drugs kill the worms; the swelling is often permanent. |

### Snake venom

| Claim id | Field | What the app says |
|---|---|---|
| `DISEASE/Snake venom/Discovered` | Discovered | Antivenom invented by Albert Calmette, 1895. Using antibodies from horses. |
| `DISEASE/Snake venom/Causes` | Causes | Not alive, not a germ. A mix of toxic proteins. Attacks heart, kidneys and nerves. |
| `DISEASE/Snake venom/Found` | Found | India has the world's highest snakebite death toll. Roughly 58,000 a year. |
| `DISEASE/Snake venom/Prevent` | Prevent | Boots and a torch after dark; never reach blindly into grass. |
| `DISEASE/Snake venom/Treat` | Treat | ANTIVENOM. Borrowed antibodies. PASSIVE immunity: instant, but temporary. |

### Russell's viper venom

| Claim id | Field | What the app says |
|---|---|---|
| `DISEASE/Russell's viper venom/Discovered` | Discovered | One of India's 'Big Four' snakes. |
| `DISEASE/Russell's viper venom/Causes` | Causes | Destroys blood clotting and shreds the KIDNEYS. A leading cause of snakebite death in India. |
| `DISEASE/Russell's viper venom/Found` | Found | Across the Indian subcontinent. |
| `DISEASE/Russell's viper venom/Prevent` | Prevent | Boots; clear rubble near homes; torch at night. |
| `DISEASE/Russell's viper venom/Treat` | Treat | Antivenom, urgently. Dialysis may be needed for the kidneys. |

### Red scorpion sting

| Claim id | Field | What the app says |
|---|---|---|
| `DISEASE/Red scorpion sting/Discovered` | Discovered | Indian red scorpion. Among the most lethal scorpions in the world. |
| `DISEASE/Red scorpion sting/Causes` | Causes | Venom floods the body with adrenaline; the HEART and LUNGS fail. |
| `DISEASE/Red scorpion sting/Found` | Found | Western and southern India; a major cause of child deaths in some districts. |
| `DISEASE/Red scorpion sting/Prevent` | Prevent | Shake out shoes; seal home floors. |
| `DISEASE/Red scorpion sting/Treat` | Treat | The drug prazosin transformed survival. An Indian medical breakthrough. |

### Tetanus

| Claim id | Field | What the app says |
|---|---|---|
| `DISEASE/Tetanus/Discovered` | Discovered | Toxin isolated 1890 by Kitasato and von Behring. |
| `DISEASE/Tetanus/Causes` | Causes | Its TOXIN locks the muscles rigid. 'lockjaw'. Not contagious at all. |
| `DISEASE/Tetanus/Found` | Found | Soil and rusty metal, worldwide. |
| `DISEASE/Tetanus/Prevent` | Prevent | Tetanus vaccine and boosters; clean wounds. |
| `DISEASE/Tetanus/Treat` | Treat | Antitoxin and intensive care. Only antibodies can neutralise a toxin. |
| `DISEASE/Tetanus/Fact` | Card fact | A toxin that locks muscles ('lockjaw'). |

### MRSA

| Claim id | Field | What the app says |
|---|---|---|
| `DISEASE/MRSA/Discovered` | Discovered | Methicillin-resistant Staph aureus, first seen 1961. |
| `DISEASE/MRSA/Causes` | Causes | Skin abscesses. And in the blood it can seed ANY organ, including heart valves. |
| `DISEASE/MRSA/Found` | Found | Worldwide, especially hospitals. |
| `DISEASE/MRSA/Prevent` | Prevent | Hand hygiene; careful antibiotic use. |
| `DISEASE/MRSA/Treat` | Treat | Only a few antibiotics still work. The classic superbug. |
| `DISEASE/MRSA/Fact` | Card fact | A superbug. In the blood it can seed ANY organ, including heart valves. |

### Cellulitis

| Claim id | Field | What the app says |
|---|---|---|
| `DISEASE/Cellulitis/Discovered` | Discovered | Caused by Streptococcus or Staphylococcus. |
| `DISEASE/Cellulitis/Causes` | Causes | Hot, red, spreading skin infection; can reach blood, bone and heart valves. |
| `DISEASE/Cellulitis/Found` | Found | Worldwide. |
| `DISEASE/Cellulitis/Prevent` | Prevent | Clean and cover cuts. |
| `DISEASE/Cellulitis/Treat` | Treat | Antibiotics. |
| `DISEASE/Cellulitis/Fact` | Card fact | Staph/Strep skin infection; can settle on heart valves. |

### Leptospirosis

| Claim id | Field | What the app says |
|---|---|---|
| `DISEASE/Leptospirosis/Discovered` | Discovered | Bacterium identified 1907. |
| `DISEASE/Leptospirosis/Causes` | Causes | Fever, then kidney and liver failure (Weil's disease). |
| `DISEASE/Leptospirosis/Found` | Found | Tropics; a monsoon and flood disease in India. |
| `DISEASE/Leptospirosis/Prevent` | Prevent | Avoid wading in floodwater with open cuts; rodent control. |
| `DISEASE/Leptospirosis/Treat` | Treat | Antibiotics, early. |
| `DISEASE/Leptospirosis/Fact` | Card fact | Enters through cuts in floodwater. A monsoon risk. |

### Gas gangrene

| Claim id | Field | What the app says |
|---|---|---|
| `DISEASE/Gas gangrene/Discovered` | Discovered | Clostridium perfringens. Notorious in the trenches of WWI. |
| `DISEASE/Gas gangrene/Causes` | Causes | Destroys tissue fast, producing gas; its toxins poison the kidneys. |
| `DISEASE/Gas gangrene/Found` | Found | Worldwide, in deep dirty wounds. |
| `DISEASE/Gas gangrene/Prevent` | Prevent | Clean deep wounds promptly. |
| `DISEASE/Gas gangrene/Treat` | Treat | Surgery plus antibiotics. A true emergency. |
| `DISEASE/Gas gangrene/Fact` | Card fact | Destroys deep tissue fast; a surgical emergency. |

### Syphilis

| Claim id | Field | What the app says |
|---|---|---|
| `DISEASE/Syphilis/Discovered` | Discovered | Bacterium found 1905; the first 'magic bullet' drug (Salvarsan) targeted it. |
| `DISEASE/Syphilis/Causes` | Causes | Progresses over years to attack the brain and heart. Can pass to an unborn baby. |
| `DISEASE/Syphilis/Found` | Found | Worldwide; rising again. |
| `DISEASE/Syphilis/Prevent` | Prevent | Safe practices; screening in pregnancy. |
| `DISEASE/Syphilis/Treat` | Treat | Penicillin. Still completely effective after 80 years. |

### Brucellosis

| Claim id | Field | What the app says |
|---|---|---|
| `DISEASE/Brucellosis/Discovered` | Discovered | Traced to goat's milk by David Bruce, 1887. |
| `DISEASE/Brucellosis/Causes` | Causes | Undulating fever; settles in the spleen, liver and bones. |
| `DISEASE/Brucellosis/Found` | Found | Worldwide, from unpasteurised milk and infected livestock. |
| `DISEASE/Brucellosis/Prevent` | Prevent | Pasteurise milk; vaccinate animals. |
| `DISEASE/Brucellosis/Treat` | Treat | Long courses of antibiotics. |

### Cold sore

| Claim id | Field | What the app says |
|---|---|---|
| `DISEASE/Cold sore/Discovered` | Discovered | Herpes simplex virus; known since antiquity. |
| `DISEASE/Cold sore/Causes` | Causes | Blisters on the lip. Then retreats into your NERVES to hide from antibodies. |
| `DISEASE/Cold sore/Found` | Found | Worldwide; most adults carry it. |
| `DISEASE/Cold sore/Prevent` | Prevent | Avoid contact during an outbreak. |
| `DISEASE/Cold sore/Treat` | Treat | Antivirals shorten attacks. It is never fully cleared. |
| `DISEASE/Cold sore/Fact` | Card fact | Retreats into nerves to hide from antibodies. |

### Human papillomavirus

| Claim id | Field | What the app says |
|---|---|---|
| `DISEASE/Human papillomavirus/Discovered` | Discovered | Link to cervical cancer proven by Harald zur Hausen (Nobel Prize, 2008). |
| `DISEASE/Human papillomavirus/Causes` | Causes | Hides inside cells for years and can turn them cancerous. It causes almost ALL cervical cancer. |
| `DISEASE/Human papillomavirus/Found` | Found | Worldwide; most adults meet it at some point. |
| `DISEASE/Human papillomavirus/Prevent` | Prevent | The HPV VACCINE. The first vaccine that prevents a cancer. India began rolling it out nationally; it works best given before exposure. |
| `DISEASE/Human papillomavirus/Treat` | Treat | No antiviral. Screening catches early changes. This is the clearest case in the whole deck of a vaccine stopping a cancer before it starts. |

### Ebola

| Claim id | Field | What the app says |
|---|---|---|
| `DISEASE/Ebola/Discovered` | Discovered | First outbreak near the Ebola River, 1976. |
| `DISEASE/Ebola/Causes` | Causes | Massive internal bleeding; liver and spleen collapse. Kills up to 90%. |
| `DISEASE/Ebola/Found` | Found | Central and West Africa. |
| `DISEASE/Ebola/Prevent` | Prevent | Isolation, protective equipment. And now a working vaccine. |
| `DISEASE/Ebola/Treat` | Treat | Antibody treatments and supportive care; survival has improved greatly. |

### Anthrax

| Claim id | Field | What the app says |
|---|---|---|
| `DISEASE/Anthrax/Discovered` | Discovered | Robert Koch used it in 1876 to PROVE germs cause disease. Pasteur vaccinated sheep in 1881. |
| `DISEASE/Anthrax/Causes` | Causes | Its TOXIN kills cells directly; the inhaled form is nearly always fatal. |
| `DISEASE/Anthrax/Found` | Found | Soil worldwide; affects livestock handlers. |
| `DISEASE/Anthrax/Prevent` | Prevent | Vaccinate livestock; handle hides carefully. |
| `DISEASE/Anthrax/Treat` | Treat | Antibiotics plus ANTITOXIN. The toxin must be neutralised separately. |

### Hookworm

| Claim id | Field | What the app says |
|---|---|---|
| `DISEASE/Hookworm/Discovered` | Discovered | Linked to anaemia by Arthur Looss, 1898. He infected himself by accident. |
| `DISEASE/Hookworm/Causes` | Causes | Burrows in through BARE SKIN, travels to the gut, and drinks your blood. Causing anaemia. |
| `DISEASE/Hookworm/Found` | Found | Warm damp soil where people walk barefoot. |
| `DISEASE/Hookworm/Prevent` | Prevent | Wear shoes; sanitation. |
| `DISEASE/Hookworm/Treat` | Treat | Deworming tablets plus iron. |

### Schistosomiasis

| Claim id | Field | What the app says |
|---|---|---|
| `DISEASE/Schistosomiasis/Discovered` | Discovered | Worm found by Theodor Bilharz, 1851. |
| `DISEASE/Schistosomiasis/Causes` | Causes | Larvae penetrate skin in fresh water; adult worms scar the liver and bladder. |
| `DISEASE/Schistosomiasis/Found` | Found | Africa, Middle East, parts of Asia. |
| `DISEASE/Schistosomiasis/Prevent` | Prevent | Avoid infested fresh water; snail control. |
| `DISEASE/Schistosomiasis/Treat` | Treat | Praziquantel. A single effective drug. |

### Guinea worm

| Claim id | Field | What the app says |
|---|---|---|
| `DISEASE/Guinea worm/Discovered` | Discovered | Ancient. Possibly the 'fiery serpent' of the Bible. |
| `DISEASE/Guinea worm/Causes` | Causes | A metre-long worm slowly emerges through the skin. |
| `DISEASE/Guinea worm/Found` | Found | ALMOST ERADICATED. From 3.5 million cases in 1986 to a handful today. |
| `DISEASE/Guinea worm/Prevent` | Prevent | Filter drinking water. No drug, no vaccine. Just clean water. |
| `DISEASE/Guinea worm/Treat` | Treat | Wind the worm out slowly. Proof that prevention alone can defeat a disease. |

### Histoplasmosis

| Claim id | Field | What the app says |
|---|---|---|
| `DISEASE/Histoplasmosis/Discovered` | Discovered | Described 1906. |
| `DISEASE/Histoplasmosis/Causes` | Causes | A fungus from soil with bird or bat droppings; attacks the lungs and spleen. |
| `DISEASE/Histoplasmosis/Found` | Found | Worldwide, including river valleys of India. |
| `DISEASE/Histoplasmosis/Prevent` | Prevent | Avoid dusty caves and bird roosts. |
| `DISEASE/Histoplasmosis/Treat` | Treat | Antifungals; often self-limiting in healthy people. |

### Typhoid

| Claim id | Field | What the app says |
|---|---|---|
| `DISEASE/Typhoid/Discovered` | Discovered | Salmonella Typhi; 'Typhoid Mary' spread it while healthy herself. |
| `DISEASE/Typhoid/Causes` | Causes | Prolonged high fever; infects the liver, spleen and gut. |
| `DISEASE/Typhoid/Found` | Found | Where sanitation is poor. Common in South Asia. |
| `DISEASE/Typhoid/Prevent` | Prevent | Clean water; typhoid conjugate vaccine. |
| `DISEASE/Typhoid/Treat` | Treat | Antibiotics. But drug-resistant typhoid is spreading in India and Pakistan. |
| `DISEASE/Typhoid/Fact` | Card fact | Unclean water; hits liver and spleen. |

### Cholera

| Claim id | Field | What the app says |
|---|---|---|
| `DISEASE/Cholera/Discovered` | Discovered | John Snow traced it to a London water pump in 1854. The birth of epidemiology. |
| `DISEASE/Cholera/Causes` | Causes | Its TOXIN forces the gut to pour out litres of water. Dehydration kills within hours. |
| `DISEASE/Cholera/Found` | Found | Outbreaks wherever water is contaminated. |
| `DISEASE/Cholera/Prevent` | Prevent | Clean water and sanitation; oral vaccine. |
| `DISEASE/Cholera/Treat` | Treat | Oral rehydration salts (ORS). Simple, cheap, and one of the great lifesavers. |
| `DISEASE/Cholera/Fact` | Card fact | Dehydration wrecks the kidneys. |

### Dysentery

| Claim id | Field | What the app says |
|---|---|---|
| `DISEASE/Dysentery/Discovered` | Discovered | Shigella, identified by Kiyoshi Shiga, 1897. |
| `DISEASE/Dysentery/Causes` | Causes | Bloody diarrhoea; can damage the kidneys. |
| `DISEASE/Dysentery/Found` | Found | Where hygiene is poor. |
| `DISEASE/Dysentery/Prevent` | Prevent | Handwashing, clean water. |
| `DISEASE/Dysentery/Treat` | Treat | Rehydration; antibiotics when severe. |
| `DISEASE/Dysentery/Fact` | Card fact | Bloody diarrhoea from dirty water. |

### Food poisoning

| Claim id | Field | What the app says |
|---|---|---|
| `DISEASE/Food poisoning/Discovered` | Discovered | E. coli described by Theodor Escherich, 1885. |
| `DISEASE/Food poisoning/Causes` | Causes | Cramps and diarrhoea; some strains harm the kidneys. |
| `DISEASE/Food poisoning/Found` | Found | Worldwide. |
| `DISEASE/Food poisoning/Prevent` | Prevent | Cook food properly; wash hands. |
| `DISEASE/Food poisoning/Treat` | Treat | Usually self-limiting; rehydration. |
| `DISEASE/Food poisoning/Fact` | Card fact | Some E. coli damage the kidneys (HUS). |

### Listeria

| Claim id | Field | What the app says |
|---|---|---|
| `DISEASE/Listeria/Discovered` | Discovered | Named after Joseph Lister, 1940. |
| `DISEASE/Listeria/Causes` | Causes | Survives refrigeration; crosses into the BRAIN and the placenta. |
| `DISEASE/Listeria/Found` | Found | Soft cheeses, deli meats; worldwide. |
| `DISEASE/Listeria/Prevent` | Prevent | Avoid unpasteurised dairy in pregnancy. |
| `DISEASE/Listeria/Treat` | Treat | Antibiotics. |

### Stomach ulcer (H. pylori)

| Claim id | Field | What the app says |
|---|---|---|
| `DISEASE/Stomach ulcer (H. pylori)/Discovered` | Discovered | Barry Marshall DRANK the bacteria in 1984 to prove they cause ulcers. He won the Nobel Prize. |
| `DISEASE/Stomach ulcer (H. pylori)/Causes` | Causes | Burrows into the stomach lining; causes ulcers and stomach cancer. |
| `DISEASE/Stomach ulcer (H. pylori)/Found` | Found | Perhaps half the world carries it. |
| `DISEASE/Stomach ulcer (H. pylori)/Prevent` | Prevent | Hygiene and clean water. |
| `DISEASE/Stomach ulcer (H. pylori)/Treat` | Treat | Antibiotics CURE it. Ulcers were once thought to be caused by stress. |

### Rotavirus

| Claim id | Field | What the app says |
|---|---|---|
| `DISEASE/Rotavirus/Discovered` | Discovered | Discovered 1973. |
| `DISEASE/Rotavirus/Causes` | Causes | Severe diarrhoea and dehydration in young children. |
| `DISEASE/Rotavirus/Found` | Found | Worldwide; a leading killer of children before vaccines. |
| `DISEASE/Rotavirus/Prevent` | Prevent | Rotavirus vaccine. Now in India's immunisation programme. |
| `DISEASE/Rotavirus/Treat` | Treat | Oral rehydration. |
| `DISEASE/Rotavirus/Fact` | Card fact | A top cause of child diarrhoea. Vaccine-preventable. |

### Hepatitis A

| Claim id | Field | What the app says |
|---|---|---|
| `DISEASE/Hepatitis A/Discovered` | Discovered | Virus identified 1973. |
| `DISEASE/Hepatitis A/Causes` | Causes | Liver inflammation and jaundice; no chronic form. |
| `DISEASE/Hepatitis A/Found` | Found | Where sanitation is poor. |
| `DISEASE/Hepatitis A/Prevent` | Prevent | Vaccine; clean food and water. |
| `DISEASE/Hepatitis A/Treat` | Treat | Rest; recovery is usually complete. |
| `DISEASE/Hepatitis A/Fact` | Card fact | A liver virus from contaminated food or water. |

### Hepatitis E

| Claim id | Field | What the app says |
|---|---|---|
| `DISEASE/Hepatitis E/Discovered` | Discovered | Recognised after outbreaks in INDIA in the 1970s-80s. |
| `DISEASE/Hepatitis E/Causes` | Causes | Liver inflammation; especially dangerous in pregnancy. |
| `DISEASE/Hepatitis E/Found` | Found | Waterborne; common in South Asia. |
| `DISEASE/Hepatitis E/Prevent` | Prevent | Clean water. |
| `DISEASE/Hepatitis E/Treat` | Treat | Supportive care. |
| `DISEASE/Hepatitis E/Fact` | Card fact | Waterborne liver virus. |

### Norovirus

| Claim id | Field | What the app says |
|---|---|---|
| `DISEASE/Norovirus/Discovered` | Discovered | Traced to an outbreak in Norwalk, Ohio, 1968. |
| `DISEASE/Norovirus/Causes` | Causes | Sudden violent vomiting and diarrhoea; astonishingly contagious. |
| `DISEASE/Norovirus/Found` | Found | Worldwide. Famous on cruise ships and in schools. |
| `DISEASE/Norovirus/Prevent` | Prevent | Handwashing (alcohol gel works poorly here). |
| `DISEASE/Norovirus/Treat` | Treat | Rehydration; passes in a couple of days. |
| `DISEASE/Norovirus/Fact` | Card fact | The 'winter vomiting' bug. |

### Polio

| Claim id | Field | What the app says |
|---|---|---|
| `DISEASE/Polio/Discovered` | Discovered | Vaccines by Salk (1955) and Sabin (oral, 1961). |
| `DISEASE/Polio/Causes` | Causes | Enters through the gut; destroys nerve cells and paralyses. |
| `DISEASE/Polio/Found` | Found | Nearly eradicated. INDIA was declared polio-free in 2014. |
| `DISEASE/Polio/Prevent` | Prevent | Oral polio vaccine. One of the great public-health triumphs. |
| `DISEASE/Polio/Treat` | Treat | No cure for the paralysis. Prevention is everything. |
| `DISEASE/Polio/Fact` | Card fact | Enters via the gut, attacks nerves. |

### Botulism

| Claim id | Field | What the app says |
|---|---|---|
| `DISEASE/Botulism/Discovered` | Discovered | Toxin identified 1895. The most poisonous substance known to science. |
| `DISEASE/Botulism/Causes` | Causes | Not alive. Paralyses every muscle, including breathing. A few nanograms can kill. |
| `DISEASE/Botulism/Found` | Found | Improperly canned or preserved food. |
| `DISEASE/Botulism/Prevent` | Prevent | Proper canning; never feed honey to infants. |
| `DISEASE/Botulism/Treat` | Treat | ANTITOXIN. (In tiny doses this same toxin is Botox.) |

### Shiga toxin (E. coli O157)

| Claim id | Field | What the app says |
|---|---|---|
| `DISEASE/Shiga toxin (E. coli O157)/Discovered` | Discovered | Named after Kiyoshi Shiga. |
| `DISEASE/Shiga toxin (E. coli O157)/Causes` | Causes | Not alive. Destroys the KIDNEYS (haemolytic uraemic syndrome), especially in children. |
| `DISEASE/Shiga toxin (E. coli O157)/Found` | Found | Undercooked beef, unpasteurised milk. |
| `DISEASE/Shiga toxin (E. coli O157)/Prevent` | Prevent | Cook meat thoroughly. |
| `DISEASE/Shiga toxin (E. coli O157)/Treat` | Treat | Supportive care and dialysis. Antibiotics can make it WORSE by releasing more toxin. |

### Roundworm

| Claim id | Field | What the app says |
|---|---|---|
| `DISEASE/Roundworm/Discovered` | Discovered | Ascaris lumbricoides. Grows up to 35 cm long. |
| `DISEASE/Roundworm/Causes` | Causes | Larvae migrate THROUGH THE LUNGS, then return to the gut. Can block the intestines. |
| `DISEASE/Roundworm/Found` | Found | Where sanitation is poor. One of the commonest infections on Earth. |
| `DISEASE/Roundworm/Prevent` | Prevent | Sanitation; deworming programmes. |
| `DISEASE/Roundworm/Treat` | Treat | Deworming tablets. Too big for any cell to swallow. |

### Tapeworm

| Claim id | Field | What the app says |
|---|---|---|
| `DISEASE/Tapeworm/Discovered` | Discovered | Neurocysticercosis recognised as a major cause of epilepsy. |
| `DISEASE/Tapeworm/Causes` | Causes | Larvae form cysts IN THE BRAIN. A leading cause of adult-onset epilepsy in India. |
| `DISEASE/Tapeworm/Found` | Found | Where pigs are raised with poor sanitation. |
| `DISEASE/Tapeworm/Prevent` | Prevent | Cook pork thoroughly; sanitation; handwashing. |
| `DISEASE/Tapeworm/Treat` | Treat | Antiparasitic drugs plus anti-seizure medicine. |

### Whipworm

| Claim id | Field | What the app says |
|---|---|---|
| `DISEASE/Whipworm/Discovered` | Discovered | Trichuris trichiura. |
| `DISEASE/Whipworm/Causes` | Causes | Burrows into the gut wall; causes chronic blood loss and anaemia in children. |
| `DISEASE/Whipworm/Found` | Found | Warm, humid regions worldwide. |
| `DISEASE/Whipworm/Prevent` | Prevent | Sanitation; handwashing. |
| `DISEASE/Whipworm/Treat` | Treat | Deworming tablets. |

### Amoebiasis

| Claim id | Field | What the app says |
|---|---|---|
| `DISEASE/Amoebiasis/Discovered` | Discovered | Entamoeba histolytica. The species name means 'tissue-dissolving'. |
| `DISEASE/Amoebiasis/Causes` | Causes | Eats through the gut wall and forms a LIVER ABSCESS. |
| `DISEASE/Amoebiasis/Found` | Found | Common in India and other tropical regions. |
| `DISEASE/Amoebiasis/Prevent` | Prevent | Clean water; wash vegetables. |
| `DISEASE/Amoebiasis/Treat` | Treat | Metronidazole; the abscess may need draining. |

### Giardia

| Claim id | Field | What the app says |
|---|---|---|
| `DISEASE/Giardia/Discovered` | Discovered | Seen by Antonie van Leeuwenhoek in 1681. In his own stool. |
| `DISEASE/Giardia/Causes` | Causes | Coats the gut and blocks absorption. You eat, but you starve. Draining your energy. |
| `DISEASE/Giardia/Found` | Found | Worldwide; 'beaver fever' from streams and unclean water. |
| `DISEASE/Giardia/Prevent` | Prevent | Filter or boil water. |
| `DISEASE/Giardia/Treat` | Treat | Antiparasitic drugs. |

### Toxoplasmosis

| Claim id | Field | What the app says |
|---|---|---|
| `DISEASE/Toxoplasmosis/Discovered` | Discovered | Identified 1908. |
| `DISEASE/Toxoplasmosis/Causes` | Causes | Forms silent CYSTS IN THE BRAIN and hides there for life. Dangerous to unborn babies and to people with AIDS. |
| `DISEASE/Toxoplasmosis/Found` | Found | Worldwide. From undercooked meat and cat faeces. |
| `DISEASE/Toxoplasmosis/Prevent` | Prevent | Cook meat; pregnant women should avoid cat litter. |
| `DISEASE/Toxoplasmosis/Treat` | Treat | Drugs only when it reactivates. |

### Candida

| Claim id | Field | What the app says |
|---|---|---|
| `DISEASE/Candida/Discovered` | Discovered | A yeast that lives on almost everyone, harmlessly. |
| `DISEASE/Candida/Causes` | Causes | Normally kept in check by your immune system and your other microbes. But if either falls, it invades ANY organ. |
| `DISEASE/Candida/Found` | Found | Everywhere. It is already on you right now. |
| `DISEASE/Candida/Prevent` | Prevent | Careful antibiotic use. Killing your good bacteria lets Candida bloom. |
| `DISEASE/Candida/Treat` | Treat | Antifungals. The classic OPPORTUNIST. |

### Scabies

| Claim id | Field | What the app says |
|---|---|---|
| `DISEASE/Scabies/Discovered` | Discovered | The mite was seen under a microscope in 1687. Making scabies one of the FIRST diseases ever proven to have a specific cause. |
| `DISEASE/Scabies/Causes` | Causes | A mite that burrows into your skin and lays eggs. The unbearable itch is an ALLERGIC reaction to it. Your own immune system causing the misery. |
| `DISEASE/Scabies/Found` | Found | Worldwide; ~200 million people at any moment. Spreads by prolonged skin-to-skin contact and shared bedding. |
| `DISEASE/Scabies/Prevent` | Prevent | Treat the whole household at once, and wash all bedding. |
| `DISEASE/Scabies/Treat` | Treat | Permethrin cream or ivermectin. Cheap and curable. But it keeps coming back if only one person is treated. |

### Ringworm

| Claim id | Field | What the app says |
|---|---|---|
| `DISEASE/Ringworm/Discovered` | Discovered | Not a worm at all. A FUNGUS. The name comes from the ring-shaped rash. |
| `DISEASE/Ringworm/Causes` | Causes | A fungus digesting the keratin in your skin, hair and nails. |
| `DISEASE/Ringworm/Found` | Found | Everywhere. Spreads by touch, shared towels, and from animals. |
| `DISEASE/Ringworm/Prevent` | Prevent | Do not share towels or combs; keep skin dry. |
| `DISEASE/Ringworm/Treat` | Treat | Antifungal cream. The commonest fungal infection on Earth. And one of the most misnamed. |

### Impetigo

| Claim id | Field | What the app says |
|---|---|---|
| `DISEASE/Impetigo/Discovered` | Discovered | Streptococcus or Staphylococcus on the skin. |
| `DISEASE/Impetigo/Causes` | Causes | Golden crusted sores, mainly in children. Highly contagious by touch. Can lead to kidney damage. |
| `DISEASE/Impetigo/Found` | Found | Worldwide; common where it is hot and crowded. |
| `DISEASE/Impetigo/Prevent` | Prevent | Wash hands and cuts; do not share towels. |
| `DISEASE/Impetigo/Treat` | Treat | Antibiotic cream or tablets. |

### Trachoma

| Claim id | Field | What the app says |
|---|---|---|
| `DISEASE/Trachoma/Discovered` | Discovered | Chlamydia trachomatis. The SAME species that causes the sexually transmitted infection, arriving by a completely different route. |
| `DISEASE/Trachoma/Causes` | Causes | Repeated infection scars the eyelid until the lashes turn INWARD and scrape the eye. Blindness comes slowly, over years. |
| `DISEASE/Trachoma/Found` | Found | The world's leading INFECTIOUS cause of blindness. India has fought a long campaign against it. |
| `DISEASE/Trachoma/Prevent` | Prevent | Face-washing and clean water. The 'SAFE' strategy. Flies spread it between children's eyes. |
| `DISEASE/Trachoma/Treat` | Treat | A single dose of azithromycin. Surgery for the eyelid. **A disease of poverty, cured by soap and water.** |

### Conjunctivitis

| Claim id | Field | What the app says |
|---|---|---|
| `DISEASE/Conjunctivitis/Discovered` | Discovered | Adenovirus. 'pink eye'. |
| `DISEASE/Conjunctivitis/Causes` | Causes | Red, weeping, gritty eyes. Astonishingly contagious: rub your eye, touch a door handle, and the next person has it. |
| `DISEASE/Conjunctivitis/Found` | Found | Worldwide; sweeps through schools. |
| `DISEASE/Conjunctivitis/Prevent` | Prevent | Wash hands. Do not share towels or pillows. |
| `DISEASE/Conjunctivitis/Treat` | Treat | Usually clears itself. A NAKED virus. No envelope, so it survives on surfaces for days and hand-gel works poorly on it. |

### Molluscum contagiosum

| Claim id | Field | What the app says |
|---|---|---|
| `DISEASE/Molluscum contagiosum/Discovered` | Discovered | A poxvirus. A distant cousin of smallpox. |
| `DISEASE/Molluscum contagiosum/Causes` | Causes | Small pearly bumps, spread by skin contact and shared towels. Harmless but stubborn. |
| `DISEASE/Molluscum contagiosum/Found` | Found | Worldwide; common in children. |
| `DISEASE/Molluscum contagiosum/Prevent` | Prevent | Do not share towels; cover the bumps. |
| `DISEASE/Molluscum contagiosum/Treat` | Treat | Usually clears on its own. But it can take a year. Your immune system gets there eventually. |

### Endocarditis

| Claim id | Field | What the app says |
|---|---|---|
| `DISEASE/Endocarditis/Discovered` | Discovered | Infection of the heart valves. Described by William Osler, 1885. |
| `DISEASE/Endocarditis/Causes` | Causes | Bacteria in the bloodstream settle on a HEART VALVE and build a colony there, where blood flow shields them from your immune cells. |
| `DISEASE/Endocarditis/Found` | Found | Worldwide. A risk after dental work, IV drug use, or a contaminated line. And after rheumatic fever has damaged a valve. |
| `DISEASE/Endocarditis/Prevent` | Prevent | Treat bloodstream infections early; look after damaged valves. |
| `DISEASE/Endocarditis/Treat` | Treat | Weeks of intravenous antibiotics; sometimes surgery to replace the valve. |

### Gonorrhoea

| Claim id | Field | What the app says |
|---|---|---|
| `DISEASE/Gonorrhoea/Discovered` | Discovered | Bacterium found by Albert Neisser, 1879. |
| `DISEASE/Gonorrhoea/Causes` | Causes | Infects the reproductive tract; can spread to joints and heart valves. Often causes NO symptoms. So it spreads silently. |
| `DISEASE/Gonorrhoea/Found` | Found | Worldwide; about 82 million new cases a year. |
| `DISEASE/Gonorrhoea/Prevent` | Prevent | Condoms; testing and treating partners. |
| `DISEASE/Gonorrhoea/Treat` | Treat | Antibiotics. But it has now defeated almost every antibiotic we have. The WHO lists it as a PRIORITY superbug. This is antibiotic resistance happening in real time. |

### Chlamydia

| Claim id | Field | What the app says |
|---|---|---|
| `DISEASE/Chlamydia/Discovered` | Discovered | Chlamydia trachomatis. The same species that causes trachoma, the leading infectious cause of blindness. |
| `DISEASE/Chlamydia/Causes` | Causes | An INTRACELLULAR bacterium. It lives inside your cells, where antibodies struggle to reach. Usually silent; can cause infertility. |
| `DISEASE/Chlamydia/Found` | Found | The commonest bacterial STI in the world. |
| `DISEASE/Chlamydia/Prevent` | Prevent | Condoms; routine screening. |
| `DISEASE/Chlamydia/Treat` | Treat | Antibiotics. Easy to cure. But only if you know you have it. |

### Genital herpes

| Claim id | Field | What the app says |
|---|---|---|
| `DISEASE/Genital herpes/Discovered` | Discovered | Herpes simplex virus type 2. |
| `DISEASE/Genital herpes/Causes` | Causes | Like a cold sore, it retreats into your NERVES and hides there for life. Antibodies cannot follow it in. |
| `DISEASE/Genital herpes/Found` | Found | Worldwide; extremely common. |
| `DISEASE/Genital herpes/Prevent` | Prevent | Condoms reduce but do not eliminate the risk. |
| `DISEASE/Genital herpes/Treat` | Treat | Antivirals control outbreaks. It is never cleared. A lifelong passenger. |

### Trichomoniasis

| Claim id | Field | What the app says |
|---|---|---|
| `DISEASE/Trichomoniasis/Discovered` | Discovered | A single-celled protozoan parasite, described 1836. |
| `DISEASE/Trichomoniasis/Causes` | Causes | The commonest curable STI on Earth. Often silent. |
| `DISEASE/Trichomoniasis/Found` | Found | Worldwide. Around 156 million cases a year. |
| `DISEASE/Trichomoniasis/Prevent` | Prevent | Condoms; treating partners. |
| `DISEASE/Trichomoniasis/Treat` | Treat | A single course of metronidazole cures it. |

### Hepatitis D

| Claim id | Field | What the app says |
|---|---|---|
| `DISEASE/Hepatitis D/Discovered` | Discovered | Identified 1977. The strangest virus in this deck. |
| `DISEASE/Hepatitis D/Causes` | Causes | It is INCOMPLETE. It cannot infect you on its own: it can ONLY survive if Hepatitis B is already there, because it borrows Hep B's outer coat. A virus that parasitises another virus. |
| `DISEASE/Hepatitis D/Found` | Found | Wherever Hepatitis B is; the most severe form of viral hepatitis. |
| `DISEASE/Hepatitis D/Prevent` | Prevent | The Hepatitis B vaccine ALSO prevents Hepatitis D. Block the host and the passenger cannot land. |
| `DISEASE/Hepatitis D/Treat` | Treat | Hard to treat. Prevention through the Hep B vaccine is the real answer. |

### Transfusion malaria

| Claim id | Field | What the app says |
|---|---|---|
| `DISEASE/Transfusion malaria/Discovered` | Discovered | Malaria delivered straight into the bloodstream by transfused blood. |
| `DISEASE/Transfusion malaria/Causes` | Causes | It SKIPS the mosquito and skips the tissues. It goes directly to the liver. |
| `DISEASE/Transfusion malaria/Found` | Found | Anywhere blood is not properly screened. |
| `DISEASE/Transfusion malaria/Prevent` | Prevent | Screening donated blood. Which is why blood banks test every unit. |
| `DISEASE/Transfusion malaria/Treat` | Treat | Antimalarials. This is why safe transfusion is a public-health issue, not just a hospital one. |

### Catheter sepsis

| Claim id | Field | What the app says |
|---|---|---|
| `DISEASE/Catheter sepsis/Discovered` | Discovered | A fungal bloodstream infection from a drip line or catheter. |
| `DISEASE/Catheter sepsis/Causes` | Causes | Candida travelling up a plastic tube straight into your blood, bypassing every barrier you have. |
| `DISEASE/Catheter sepsis/Found` | Found | Hospitals worldwide. One of the commonest hospital-acquired infections. |
| `DISEASE/Catheter sepsis/Prevent` | Prevent | Sterile technique; remove lines as soon as they are not needed. |
| `DISEASE/Catheter sepsis/Treat` | Treat | Antifungals. A reminder that medicine itself can open a door. |

### Cannula infection

| Claim id | Field | What the app says |
|---|---|---|
| `DISEASE/Cannula infection/Discovered` | Discovered | Bacteria entering through a drip needle. |
| `DISEASE/Cannula infection/Causes` | Causes | Staph from the skin, pushed straight into the bloodstream by a needle. Can seed the heart valves. |
| `DISEASE/Cannula infection/Found` | Found | Hospitals worldwide. |
| `DISEASE/Cannula infection/Prevent` | Prevent | Clean the skin; change the line; wash hands. |
| `DISEASE/Cannula infection/Treat` | Treat | Antibiotics. And remove the line. |

### Tetanus toxin

| Claim id | Field | What the app says |
|---|---|---|
| `DISEASE/Tetanus toxin/Discovered` | Discovered | Isolated 1890. |
| `DISEASE/Tetanus toxin/Causes` | Causes | Not alive. Locks the muscles rigid. It does not reproduce. It simply poisons. |
| `DISEASE/Tetanus toxin/Found` | Found | Released by tetanus bacteria in a wound. |
| `DISEASE/Tetanus toxin/Prevent` | Prevent | Tetanus vaccine trains you to make ANTITOXIN. |
| `DISEASE/Tetanus toxin/Treat` | Treat | Only antibodies can neutralise it. No cell can eat a toxin. |

### Cholera toxin

| Claim id | Field | What the app says |
|---|---|---|
| `DISEASE/Cholera toxin/Discovered` | Discovered | The reason cholera kills. |
| `DISEASE/Cholera toxin/Causes` | Causes | Not alive. Forces gut cells to pump out water; the kidneys fail from dehydration. |
| `DISEASE/Cholera toxin/Found` | Found | Released by cholera bacteria. |
| `DISEASE/Cholera toxin/Prevent` | Prevent | Clean water. |
| `DISEASE/Cholera toxin/Treat` | Treat | Rehydration; antibodies neutralise the toxin. |

### Clostridial toxin

| Claim id | Field | What the app says |
|---|---|---|
| `DISEASE/Clostridial toxin/Discovered` | Discovered | The toxin of gas gangrene. |
| `DISEASE/Clostridial toxin/Causes` | Causes | Not alive. Destroys tissue and poisons the kidneys and liver. |
| `DISEASE/Clostridial toxin/Found` | Found | Deep dirty wounds. |
| `DISEASE/Clostridial toxin/Prevent` | Prevent | Clean wounds promptly. |
| `DISEASE/Clostridial toxin/Treat` | Treat | Antitoxin, surgery, antibiotics. |

### Diphtheria toxin

| Claim id | Field | What the app says |
|---|---|---|
| `DISEASE/Diphtheria toxin/Discovered` | Discovered | The toxin von Behring made the first antitoxin against. |
| `DISEASE/Diphtheria toxin/Causes` | Causes | Not alive. Poisons the HEART muscle directly. |
| `DISEASE/Diphtheria toxin/Found` | Found | Released by diphtheria bacteria. |
| `DISEASE/Diphtheria toxin/Prevent` | Prevent | DPT vaccine. |
| `DISEASE/Diphtheria toxin/Treat` | Treat | Antitoxin. Antibodies, urgently. |

### Shingles

| Claim id | Field | What the app says |
|---|---|---|
| `DISEASE/Shingles/Discovered` | Discovered | Recognised as reactivated chickenpox, 1953. |
| `DISEASE/Shingles/Causes` | Causes | The chickenpox virus hid in your nerves for decades and re-emerged. |
| `DISEASE/Shingles/Found` | Found | Anyone who has had chickenpox. |
| `DISEASE/Shingles/Prevent` | Prevent | Shingles vaccine. |
| `DISEASE/Shingles/Treat` | Treat | Antivirals. Proof that some viruses never truly leave. |

### Dengue (ADE)

| Claim id | Field | What the app says |
|---|---|---|
| `DISEASE/Dengue (ADE)/Discovered` | Discovered | Antibody-dependent enhancement, described in the 1970s. |
| `DISEASE/Dengue (ADE)/Causes` | Causes | Your antibodies from a PREVIOUS dengue do not neutralise this serotype. They HELP it into your cells. |
| `DISEASE/Dengue (ADE)/Found` | Found | Tropics. |
| `DISEASE/Dengue (ADE)/Prevent` | Prevent | Mosquito control. This is exactly why a dengue vaccine is so hard to make. |
| `DISEASE/Dengue (ADE)/Treat` | Treat | Antibodies will NOT work here. Use cells. |

### Malaria (relapse)

| Claim id | Field | What the app says |
|---|---|---|
| `DISEASE/Malaria (relapse)/Discovered` | Discovered | Hypnozoites described 1982. |
| `DISEASE/Malaria (relapse)/Causes` | Causes | A dormant form of P. vivax slept in your liver and woke months later. From nothing. |
| `DISEASE/Malaria (relapse)/Found` | Found | Wherever P. vivax occurs, including India. |
| `DISEASE/Malaria (relapse)/Prevent` | Prevent | Finish the full course of primaquine to clear the liver. |
| `DISEASE/Malaria (relapse)/Treat` | Treat | A second drug is needed specifically for the liver forms. |

### Tuberculosis (reactivated)

| Claim id | Field | What the app says |
|---|---|---|
| `DISEASE/Tuberculosis (reactivated)/Discovered` | Discovered | Latency has been known since the 19th century. |
| `DISEASE/Tuberculosis (reactivated)/Causes` | Causes | TB you thought you had beaten was only sleeping. It woke when your defences fell. |
| `DISEASE/Tuberculosis (reactivated)/Found` | Found | About a quarter of the world carries latent TB. |
| `DISEASE/Tuberculosis (reactivated)/Prevent` | Prevent | Treat latent TB in high-risk people. |
| `DISEASE/Tuberculosis (reactivated)/Treat` | Treat | Months of combination antibiotics. |

### Pneumococcal pneumonia

| Claim id | Field | What the app says |
|---|---|---|
| `DISEASE/Pneumococcal pneumonia/Discovered` | Discovered | Streptococcus pneumoniae, 1881. |
| `DISEASE/Pneumococcal pneumonia/Causes` | Causes | Moves into lungs stripped bare by influenza. This. Not the flu itself. Killed most victims in 1918. |
| `DISEASE/Pneumococcal pneumonia/Found` | Found | Worldwide. |
| `DISEASE/Pneumococcal pneumonia/Prevent` | Prevent | Pneumococcal and flu vaccines. |
| `DISEASE/Pneumococcal pneumonia/Treat` | Treat | Antibiotics. |

## Part 2 — The pathogen types

What the app tells a player about each kind of invader, and how it is beaten. These sentences name our playing pieces (Monocyte, Killer T-Cell) but they are making a claim about immunology, not about the rules.


### Virus

| Claim id | Field | What the app says |
|---|---|---|
| `TYPE/virus/beat` | How it is beaten | Antibody neutralises it, or the Monocyte engulfs it. If it hides inside a cell, only the Killer T-Cell or NK Cell can reach it. |
| `TYPE/virus/hint` | In How to play | Neutralise with a matching antibody, or the Monocyte engulfs it. |
| `TYPE/virus/rest` | In How to play | If it hides inside a cell, only the Killer T-Cell or NK Cell can reach it. |

### Hidden Virus

| Claim id | Field | What the app says |
|---|---|---|
| `TYPE/hidden/beat` | How it is beaten | It is INSIDE one of your cells. Antibodies cannot reach it there. Killer T-Cell (never misses) or NK Cell (d6 3+). Not all of these are viruses: Toxoplasmosis and Chagas disease are PROTOZOA that live inside your cells, which is why a Killer T-Cell is the answer for them too. |
| `TYPE/hidden/hint` | In How to play | It is inside one of your own cells, where antibodies cannot go. Killer T-Cell (never misses) or NK Cell (3 or more). |
| `TYPE/hidden/rest` | In How to play | Not all are viruses: Toxoplasmosis and Chagas are protozoa that live inside cells. |

### Bacteria

| Claim id | Field | What the app says |
|---|---|---|
| `TYPE/bacteria/beat` | How it is beaten | Coat it with a matching antibody, then engulf it. Or trap the swarm in a Neutrophil NET. It divides if you ignore it! |
| `TYPE/bacteria/hint` | In How to play | Coat it with a matching antibody, then engulf it, or trap the swarm in a NET. It divides if you ignore it. |
| `TYPE/bacteria/rest` | In How to play | Up to 8 can pack into one space. |

### Toxin

| Claim id | Field | What the app says |
|---|---|---|
| `TYPE/toxin/beat` | How it is beaten | It is NOT alive. No cell can eat it, trap it or snipe it. ANTITOXIN antibodies are the only defence (2 AP to neutralise). |
| `TYPE/toxin/hint` | In How to play | Not alive: nothing can eat it, trap it or snipe it. Antitoxin antibodies only, and neutralising costs 2 AP. |

### Venom

| Claim id | Field | What the app says |
|---|---|---|
| `TYPE/venom/beat` | How it is beaten | It is NOT alive and acts far too fast for your B-cells. Only an ANTIVENOM dose works. You cannot make antibodies in time. |
| `TYPE/venom/hint` | In How to play | Not alive, and far too fast for your B-cells. Only a ready-made antivenom dose works. |

### Fungus

| Claim id | Field | What the app says |
|---|---|---|
| `TYPE/fungus/beat` | How it is beaten | It CANNOT be coated. Antibodies do not opsonise fungi here. The Monocyte engulfs it directly (it has 2 HP, so that chips it), and a Neutrophil NET kills it outright. Fungi are an INNATE problem: neutrophils and macrophages do this work. |
| `TYPE/fungus/hint` | In How to play | It cannot be coated. The Monocyte engulfs it directly (2 hits, so that chips it) and a NET kills it outright. |

### Worm

| Claim id | Field | What the app says |
|---|---|---|
| `TYPE/worm/beat` | How it is beaten | Too big to swallow and immune to NETs. COAT it with an antibody, then the Eosinophil strikes (2 dmg) or degranulates (3 dmg, 2 AP, and it burns the organ). |
| `TYPE/worm/hint` | In How to play | Too big to swallow and immune to NETs. Coat it, then the Eosinophil strikes (2) or degranulates (3). |
| `TYPE/worm/rest` | In How to play | It lodges in an organ and chews it every 3 turns. |

### Malaria

| Claim id | Field | What the app says |
|---|---|---|
| `TYPE/malaria/beat` | How it is beaten | In the blood: antibodies or the Monocyte. Inside liver cells: only the Killer T-Cell or NK Cell can reach it. |
| `TYPE/malaria/hint` | In How to play | Three stages. Travelling in the blood: antibodies or the Monocyte. Inside liver cells: Killer T-Cell or NK Cell only. Back in the blood: antibodies again. |
| `TYPE/malaria/rest` | In How to play | The card has the stages. |

### Parasite

| Claim id | Field | What the app says |
|---|---|---|
| `TYPE/parasite/beat` | How it is beaten | Coat it, then STRIKE it down with the Eosinophil (2 dmg) or Monocyte (1 dmg). Once it is on its last HP the Monocyte can finally engulf it. NETs do not hold it. |
| `TYPE/parasite/hint` | In How to play | Coat it, then strike it down: Eosinophil 2 damage, Monocyte 1. |
| `TYPE/parasite/rest` | In How to play | Once it is on its last hit point the Monocyte can finally swallow it. |

## Part 3 — The cells

Seven cells a player commands, each with a card, and seven resident macrophages named for the tissue they live in. **Fourteen named cell types in total.** A cell name is repeated more often than any sentence in the app, because it is what the player calls the piece for the whole game, so a wrong name is the most-repeated error available to us.


### Monocyte

| Claim id | Field | What the app says |
|---|---|---|
| `CELL/macrophage/Name` | The name we use | The app calls this piece the Monocyte, for the real-world macrophage. |
| `CELL/macrophage/role` | What it does | The big eater. It engulfs one pathogen at a time, the first each turn free and then 1 Action Point each, and every meal raises antigen presentation, the bridge that switches on the adaptive cells. |
| `CELL/macrophage/home` | Where it comes from | Made in the marrow. It circulates in the blood as a monocyte and enters tissue where it is needed, maturing into a macrophage there. In the game it starts in the Bloodstream and goes wherever you send it. |
| `CELL/macrophage/bestAgainst` | What it is best against | Viruses and coated bacteria on its own space, and blood-stage malaria. It cannot swallow a worm or a full-strength protozoan. Those are physically too big and must be struck down first. |
| `CELL/macrophage/deficiency` | What happens without it | Without phagocytes, bacteria and fungi are never cleared, and nothing is ever presented to the adaptive team, so antibodies and killer cells never get their start. |
| `CELL/macrophage/fact` | Card fact | A macrophage can engulf tuberculosis bacteria and still fail to kill them. It takes a helper T-cell signal to finish the job, which is why tuberculosis wakes up when helper T-cell counts fall. |
| `CELL/macrophage/hint` | In How to play | Engulf: free once a turn, then 1 AP. Swallows a virus, a coated bacterium, a fungus, blood-stage malaria, or a parasite already down to its last hit point. |
| `CELL/macrophage/rest` | In How to play | Strike: 1 damage to a coated worm or parasite. |

### Neutrophil

| Claim id | Field | What the app says |
|---|---|---|
| `CELL/neutrophil/Name` | The name we use | The app calls this piece the Neutrophil, for the real-world neutrophil. |
| `CELL/neutrophil/role` | What it does | The first responder. It swarms a site and destroys every living microbe standing there at once. Then it is spent, and the marrow takes four turns to replace it, or two with a primed Helper T-Cell in the Bloodstream. |
| `CELL/neutrophil/home` | Where it comes from | The bloodstream, in enormous numbers: the most abundant white cell in the body, made and replaced by the marrow continuously. In the game it starts in the Bloodstream and moves two steps per Action Point. |
| `CELL/neutrophil/bestAgainst` | What it is best against | A swarm: bacteria, fungi and viruses standing together on one space. Not worms, not toxins, and nothing hiding inside one of your own cells. |
| `CELL/neutrophil/deficiency` | What happens without it | Neutropenia, too few neutrophils, as after chemotherapy, leaves the body open to bacterial and fungal infections that are normally stopped within hours. |
| `CELL/neutrophil/fact` | Card fact | Neutrophils live only a day or so, and the marrow makes about a hundred billion of them every day. Their NETs are webs of their own DNA, thrown out to trap and kill microbes. |
| `CELL/neutrophil/hint` | In How to play | NET: traps every living microbe on its own space. |
| `CELL/neutrophil/rest` | In How to play | Then it is spent and returns after 4 turns, or 2 if a primed Helper T-Cell is in the bloodstream. |

### B-Cell

| Claim id | Field | What the app says |
|---|---|---|
| `CELL/bcell/Name` | The name we use | The app calls this piece the B-Cell, for the real-world bcell. |
| `CELL/bcell/role` | What it does | The antibody factory. It produces antibodies of one class at a time; the antibodies then coat or neutralise pathogens of that class wherever they are. |
| `CELL/bcell/home` | Where it comes from | Made in the marrow (the B). In the game it starts in the Bloodstream and produces from wherever it stands, best beside a primed Helper T-Cell, which adds one antibody per action. |
| `CELL/bcell/bestAgainst` | What it is best against | Anything with an antigen class. Its antibodies tag bacteria, worms and parasites so other cells can attack them, and neutralise viruses and toxins outright. A novel antigen is out of reach until clonal selection finds the one clone that fits it. |
| `CELL/bcell/deficiency` | What happens without it | No B-cells means no antibodies: bacteria and toxins outside cells run unchecked, and there is nothing for a vaccine to build on. The human version is X-linked agammaglobulinaemia. |
| `CELL/bcell/fact` | Card fact | Your body already carries B-cells for antigens it has never met. Finding the one that fits a new pathogen, clonal selection, is why a first response takes days, and why the second time is fast. |
| `CELL/bcell/hint` | In How to play | Never moves. Produce antibodies of one antigen class. |
| `CELL/bcell/rest` | In How to play | Coat a bacterium, worm or parasite. Neutralise a virus, or a toxin for 2 AP. Vaccinate, 5 AP in total. Search for the clone, 3 AP, for Pathogen X. |

### Killer T-Cell

| Claim id | Field | What the app says |
|---|---|---|
| `CELL/tcell/Name` | The name we use | The app calls this piece the Killer T-Cell, for the real-world tcell. |
| `CELL/tcell/role` | What it does | The sniper. It kills infected cells, anything hiding inside one of your own cells, from a distance, and it never misses. |
| `CELL/tcell/home` | Where it comes from | Matured in the thymus (the T), then circulating. In the game it starts in the Bloodstream and strikes along its own route or branch within its range: 3 on Training, 2 on Normal and Hard, +1 beside a primed Helper T-Cell. |
| `CELL/tcell/bestAgainst` | What it is best against | Hidden viruses and the protozoa that live inside cells: Toxoplasma, Chagas, liver-stage malaria, a parasite inside a resident macrophage. Useless against anything out in the open. |
| `CELL/tcell/deficiency` | What happens without it | Without killer T-cells, a virus that hides inside cells is never cleared, because the infected cell is never destroyed. Reactivating viruses like shingles are what a weakened T-cell system lets through. |
| `CELL/tcell/fact` | Card fact | A killer T-cell recognises an infected cell by the fragments of virus that cell displays on its own surface. The cell reports its own infection. |
| `CELL/tcell/hint` | In How to play | Snipe: destroys a pathogen hiding inside one of your cells. Never misses. |
| `CELL/tcell/rest` | In How to play | Range 3 on Training, 2 on Normal and Hard, +1 while a primed Helper stands with it. |

### Helper T-Cell

| Claim id | Field | What the app says |
|---|---|---|
| `CELL/helper/Name` | The name we use | The app calls this piece the Helper T-Cell, for the real-world helper. |
| `CELL/helper/role` | What it does | The conductor. It kills nothing and takes no attacking action; it licenses other cells by standing with them, but only once it has been primed by antigen presentation. |
| `CELL/helper/home` | Where it comes from | The Bloodstream at the start. Where it stands afterwards is the whole game: beside the B-Cell, beside the Killer T-Cell, beside the Eosinophil, or parked in the blood. |
| `CELL/helper/bestAgainst` | What it is best against | Nothing directly. Beside the B-Cell: +1 antibody per action. Beside the Killer T-Cell: +1 range. Beside the Eosinophil: +1 step. Standing in the Bloodstream: the Neutrophil returns in 2 turns instead of 4. |
| `CELL/helper/deficiency` | What happens without it | HIV destroys helper T-cells, and the whole adaptive system collapses with them. That is what AIDS is: not the virus's own damage but the loss of the coordinating layer, leaving the body open to infections it would normally handle easily. |
| `CELL/helper/fact` | Card fact | Its three bonuses are real T-helper subsets: Th2 releases IL-5 to recruit eosinophils; Th17 releases IL-17, which drives G-CSF and steps up neutrophil production in the marrow; and direct contact is what licenses a B-cell to make antibodies properly. |
| `CELL/helper/hint` | In How to play | It kills nothing. It licenses your other cells, and only after it has been primed. |
| `CELL/helper/rest` | In How to play | Priming means an antigen has been presented, which happens the first time any of your cells engulfs or destroys a pathogen. With the B-Cell: +1 antibody per action. With the Killer T-Cell: +1 range. With the Eosinophil: +1 step. In the bloodstream: the Neutrophil returns in 2 turns. |

### NK Cell

| Claim id | Field | What the app says |
|---|---|---|
| `CELL/nk/Name` | The name we use | The app calls this piece the NK Cell, for the real-world nk. |
| `CELL/nk/role` | What it does | The innate killer. It needs no antigen and no priming, so it attacks an infected cell at once, but it rolls a die, and hits on a 3 or more. |
| `CELL/nk/home` | Where it comes from | The bloodstream, patrolling on its own. In the game it starts in the Bloodstream, moves two steps per Action Point, and reaches one step around it. |
| `CELL/nk/bestAgainst` | What it is best against | The same hidden targets as the Killer T-Cell, viruses and protozoa inside your own cells, earlier and less reliably. Its reach is one step; the Killer T-Cell reaches further and never misses. |
| `CELL/nk/deficiency` | What happens without it | People born without NK cells suffer repeated, severe herpesvirus infections: the viruses that hide inside cells early, before the T-cells are ready. |
| `CELL/nk/fact` | Card fact | NK cells kill cells that have stopped showing their identity papers. A virus that hides a cell's surface markers from T-cells makes that cell a target for NK cells instead. |
| `CELL/nk/hint` | In How to play | NK strike: attacks a hidden or infected cell within one step, on a die roll of 3 or more. |
| `CELL/nk/rest` | In How to play | Needs no antigen and no antibody. |

### Eosinophil

| Claim id | Field | What the app says |
|---|---|---|
| `CELL/eosinophil/Name` | The name we use | The app calls this piece the Eosinophil, for the real-world eosinophil. |
| `CELL/eosinophil/role` | What it does | The anti-parasite specialist. It strikes a coated worm or parasite for 2 damage, or degranulates for 3, enough to kill a worm outright, at the price of burning the organ it stands in and four turns spent. |
| `CELL/eosinophil/home` | Where it comes from | Made in the marrow, circulating in small numbers and recruited to wherever a parasite is. In the game it starts in the Bloodstream and gains a step beside a primed Helper T-Cell. That is IL-5. |
| `CELL/eosinophil/bestAgainst` | What it is best against | Worms and large parasites, once antibodies have coated them. It cannot touch an uncoated one, and it is no use against bacteria or viruses. |
| `CELL/eosinophil/deficiency` | What happens without it | Without eosinophils the body loses its specialist weapon against worms, and some worm infections take longer to clear. Where they are over-active, the same granules turn on the body's own airways. That is asthma and allergy. |
| `CELL/eosinophil/fact` | Card fact | Eosinophil granules are indiscriminate poison. That is why parasitic infections cause chronic inflammation and scarring, and why degranulating should feel like a decision rather than a free hit. |
| `CELL/eosinophil/hint` | In How to play | Strike: 2 damage to a coated worm or parasite. |
| `CELL/eosinophil/rest` | In How to play | Degranulate, 2 AP: 3 damage, enough to kill a worm outright, but it burns the organ it stands in and the cell is spent for 4 turns. |

### The resident macrophages

| Claim id | Field | What the app says |
|---|---|---|
| `CELL/resident/hint` | In How to play | One lives in each organ. Patrol: 1 AP per step along its own organ branch. |
| `CELL/resident/rest` | In How to play | It may never leave that branch, and it must be out on the branch to meet anything: nothing can be engulfed in the organ box itself. Engulf, free once per turn: destroy one virus or coated bacterium on its space. |

### Cardiac macrophage

| Claim id | Field | What the app says |
|---|---|---|
| `CELL/resident/heart` | The name we use | The macrophage that lives in the Heart is called the Cardiac macrophage. |

### Alveolar macrophage

| Claim id | Field | What the app says |
|---|---|---|
| `CELL/resident/lungs` | The name we use | The macrophage that lives in the Lungs is called the Alveolar macrophage. |

### Kupffer cell

| Claim id | Field | What the app says |
|---|---|---|
| `CELL/resident/liver` | The name we use | The macrophage that lives in the Liver is called the Kupffer cell. |

### Microglia

| Claim id | Field | What the app says |
|---|---|---|
| `CELL/resident/brain` | The name we use | The macrophage that lives in the Brain is called the Microglia. |

### Marrow macrophage

| Claim id | Field | What the app says |
|---|---|---|
| `CELL/resident/marrow` | The name we use | The macrophage that lives in the Bone Marrow is called the Marrow macrophage. |

### Splenic macrophage

| Claim id | Field | What the app says |
|---|---|---|
| `CELL/resident/spleen` | The name we use | The macrophage that lives in the Spleen is called the Splenic macrophage. |

### Renal macrophage

| Claim id | Field | What the app says |
|---|---|---|
| `CELL/resident/kidneys` | The name we use | The macrophage that lives in the Kidneys is called the Renal macrophage. |

## Part 4 — The antigen classes

The app groups pathogens into six classes by what an antibody actually binds to, and shows this description of each. Which disease we put in which class is a game decision and is not included; whether the description of the class is true is not.


### Enveloped virus

| Claim id | Field | What the app says |
|---|---|---|
| `CLASS/ENV` | What it is | Wrapped in a stolen piece of your own cell membrane, studded with spike proteins. Antibodies target the spikes. |

### Naked virus

| Claim id | Field | What the app says |
|---|---|---|
| `CLASS/NAK` | What it is | No envelope. A bare protein shell. Tough, survives on surfaces, and antibodies must grip the capsid itself. |

### Extracellular bacterium

| Claim id | Field | What the app says |
|---|---|---|
| `CLASS/EXB` | What it is | Lives outside your cells, often behind a slimy capsule. Antibodies opsonise it so phagocytes can grip it. |

### Intracellular bacterium

| Claim id | Field | What the app says |
|---|---|---|
| `CLASS/ICB` | What it is | Hides INSIDE your cells, where antibodies struggle to follow. This is why TB is so hard to kill. |

### Toxin (antitoxin)

| Claim id | Field | What the app says |
|---|---|---|
| `CLASS/TOX` | What it is | Not alive at all. Cannot be eaten. Antibodies (antitoxin) are the ONLY defence. |

### Eukaryotic parasite

| Claim id | Field | What the app says |
|---|---|---|
| `CLASS/EUK` | What it is | Fungi, worms and protozoa. Complex cells like ours, so they are hard to target without harming yourself. |

## Part 5 — The organs

What the app says about how infection reaches each organ. The damage each organ takes before it is lost is a game number and is not included.


### Heart

| Claim id | Field | What the app says |
|---|---|---|
| `ORGAN/heart` | How infection reaches it | The heart itself can be infected. Staph on the valves (endocarditis), Lyme carditis, viral myocarditis. Germs only passing through the bloodstream do NOT infect it; only germs that target heart tissue do. |

### Lungs

| Claim id | Field | What the app says |
|---|---|---|
| `ORGAN/lungs` | How infection reaches it | Damaged lungs mean poor gas exchange. The whole body weakens. |

### Liver

| Claim id | Field | What the app says |
|---|---|---|
| `ORGAN/liver` | How infection reaches it | The liver makes many defence proteins; damage it and antibody supply falls. |

### Bone Marrow

| Claim id | Field | What the app says |
|---|---|---|
| `ORGAN/marrow` | How infection reaches it | All immune cells are made in the marrow. |

### Brain

| Claim id | Field | What the app says |
|---|---|---|
| `ORGAN/brain` | How infection reaches it | Immune privilege: the blood-brain barrier keeps immune cells out, so it is hard to defend and cannot take much damage. |

### Spleen

| Claim id | Field | What the app says |
|---|---|---|
| `ORGAN/spleen` | How infection reaches it | The spleen filters encapsulated bacteria from the blood. Without it, bacterial infection runs wild. |

### Kidneys

| Claim id | Field | What the app says |
|---|---|---|
| `ORGAN/kidneys` | How infection reaches it | Damaged kidneys leak antibodies into the urine. A real cause of secondary immunodeficiency. |

## Part 6 — Why each event happens

Things that happen to the body during a game. Each carries a one-sentence reason, which is the app explaining pathophysiology in the smallest space it ever uses, and therefore where a compression error is most likely. What the event does in the game is not included.


### Immunosuppression

| Claim id | Field | What the app says |
|---|---|---|
| `EVENT/immunosuppression` | The reason given | Stress or malnutrition blunts the response. |

### Neutropenia

| Claim id | Field | What the app says |
|---|---|---|
| `EVENT/neutropenia` | The reason given | Neutrophil count crashes. |

### Lymphopenia

| Claim id | Field | What the app says |
|---|---|---|
| `EVENT/lymphopenia` | The reason given | A virus is destroying lymphocytes. |

### Antibody shortage

| Claim id | Field | What the app says |
|---|---|---|
| `EVENT/antibodyShortage` | The reason given | Plasma cells can't keep up. |

### Fatigue

| Claim id | Field | What the app says |
|---|---|---|
| `EVENT/fatigue` | The reason given | The whole body is exhausted: <b>1 fewer Action Point this turn only</b>. |

### Co-infection

| Claim id | Field | What the app says |
|---|---|---|
| `EVENT/coInfection` | The reason given | A second germ slips in while you're busy. |

### Acute-phase surge

| Claim id | Field | What the app says |
|---|---|---|
| `EVENT/surge` | The reason given | Inflammation floods the tissue with defenders: <b>+2 Action Points this turn only</b>. (Acute-phase proteins and a burst of cells released from the marrow.) |

### Passive antibodies

| Claim id | Field | What the app says |
|---|---|---|
| `EVENT/passiveAntibodies` | The reason given | A booster tops up your antibodies. |

### Fever

| Claim id | Field | What the app says |
|---|---|---|
| `EVENT/fever` | The reason given | Raised temperature slows the invaders (at an energy cost). |

### Malaria relapse

| Claim id | Field | What the app says |
|---|---|---|
| `EVENT/malariaRelapse` | The reason given | A dormant hypnozoite of P. vivax woke up in your liver — months later, from nothing. This is why vivax malaria needs a second drug to clear the liver. |

### Dengue — antibody-dependent enhancement

| Claim id | Field | What the app says |
|---|---|---|
| `EVENT/dengueADE` | The reason given | Your dengue antibodies from last time do NOT neutralise this serotype — they HELP it into your cells. Your own immune memory is being used against you. This is why the second dengue infection is the dangerous one. |

### TB reactivation

| Claim id | Field | What the app says |
|---|---|---|
| `EVENT/tbReactivation` | The reason given | Latent TB woke up while your defences were down. A quarter of the world carries TB silently. |

### Shingles

| Claim id | Field | What the app says |
|---|---|---|
| `EVENT/shingles` | The reason given | The chickenpox virus never left — it hid in your nerves for years and has re-emerged. |

### Post-influenza pneumonia

| Claim id | Field | What the app says |
|---|---|---|
| `EVENT/postFluPneumonia` | The reason given | Flu stripped your airway lining and bacteria moved in. This is what killed most victims of the 1918 pandemic — not the flu itself. |

### Rheumatic fever

| Claim id | Field | What the app says |
|---|---|---|
| `EVENT/rheumaticFever` | The reason given | MOLECULAR MIMICRY: your anti-Strep antibodies cannot tell the difference between the bacterium and your own heart valve — so they are attacking your heart. A leading cause of heart disease in Indian children. |

### Cytokine storm

| Claim id | Field | What the app says |
|---|---|---|
| `EVENT/cytokineStorm` | The reason given | Your immune response went into overdrive and the inflammation itself burned an organ. This is what killed young, healthy people in COVID and in 1918 — the response, not the germ. |

## Part 7 — "Why it works this way"

Fifteen passages that explain how immunity works in general, rather than describing one disease. These are the ones most likely to be quoted at a science fair or read aloud by a teacher, and they make the broadest claims in the app.


### Why surviving the window is not the win

| Claim id | Field | What the app says |
|---|---|---|
| `WHY/window` | The passage | Real infections do not end when the exposure stops. They end when the last organism is cleared. A person is not well the moment they stop being infected; they are well when their body has finished the job. That is why surviving the window is not a win. |

### Why the Blood route is short

| Claim id | Field | What the app says |
|---|---|---|
| `WHY/bloodRoute` | The passage | The Blood route is short because a needle, a transfusion or a deep wound puts an infection straight into the bloodstream, skipping the skin, the mucus and the stomach acid that stop almost everything else. Bloodborne infection is fast because it has cheated the barriers. |

### Why the lymphatic shortcuts join the routes they do

| Claim id | Field | What the app says |
|---|---|---|
| `WHY/lymphatics` | The passage | Mucosal surfaces share a common defensive system (MALT), and skin wounds drain to shared regional lymph nodes. A needle into a vein bypasses lymphatic drainage entirely, which is exactly why the Blood route has no shortcut. |

### Why the Brain is so hard to defend

| Claim id | Field | What the app says |
|---|---|---|
| `WHY/brain` | The passage | The blood-brain barrier deliberately keeps immune cells out, to protect neurons that cannot be replaced. That protection is also a weakness: it is why brain infections are so hard to clear, and why the Brain has only 2 integrity instead of 3. |

### Why you start with no antibodies

| Claim id | Field | What the app says |
|---|---|---|
| `WHY/noAntibodies` | The passage | You start with zero antibodies because the first adaptive response genuinely takes five to ten days: the one matching B-cell must be found among millions and then multiplied. The innate cells exist to buy exactly those days. |

### Why worms do not multiply inside you

| Claim id | Field | What the app says |
|---|---|---|
| `WHY/worms` | The passage | Worms are large animals that burrow into tissue rather than travelling in the blood like a virus. And unlike bacteria they cannot multiply inside you: most human worms lay eggs that must leave the body and develop outside. A person's worm burden grows through repeated exposure, not internal breeding, which is why two per game is biologically honest as well as playable. |

### Why coating a toxin-maker stops its countdown

| Claim id | Field | What the app says |
|---|---|---|
| `WHY/toxinMakers` | The passage | Coating a toxin-making bacterium stops its countdown completely: a coated bacterium never advances toward releasing its toxin. That is the game rewarding you for dealing with tetanus early, which is exactly the clinical advice. |

### Why coating is not killing

| Claim id | Field | What the app says |
|---|---|---|
| `WHY/coating` | The passage | Coating is separated from killing on purpose. An antibody is a handle, not a weapon. This is opsonisation, and it is why the B-Cell and the Monocyte have to work as a pair. |

### Why the Helper must be primed first

| Claim id | Field | What the app says |
|---|---|---|
| `WHY/priming` | The passage | A naive helper T-cell genuinely cannot help anyone until a dendritic cell presents it an antigen. The three bonuses are the real T-helper subsets: Th2 releases IL-5 to recruit eosinophils, Th17 releases IL-17 which drives G-CSF and steps up neutrophil production in the marrow, and helper contact is what licenses a B-cell to make antibodies properly. |

### Why the NK Cell rolls a die

| Claim id | Field | What the app says |
|---|---|---|
| `WHY/nkCell` | The passage | The NK cell is innate: it needs no antibody, no antigen presentation and no priming, so it works from turn one. The die is the honest price of that speed. It is fast and always available, but less precise than a Killer T-Cell. |

### Why the Eosinophil burns the organ it stands in

| Claim id | Field | What the app says |
|---|---|---|
| `WHY/eosinophil` | The passage | Eosinophil granules are indiscriminate poison. Killing a parasite inside tissue damages that tissue, which is why parasitic infections cause chronic inflammation and scarring, and why degranulating should feel like a decision rather than a free hit. |

### Why a resident never leaves its organ

| Claim id | Field | What the app says |
|---|---|---|
| `WHY/residents` | The passage | Tissue-resident macrophages, Kupffer cells in the liver, alveolar macrophages in the lungs, microglia in the brain, live permanently in one organ and never circulate. The 'never leaves' rule is what tissue-residency means. |

### Why malaria needs three different defences

| Claim id | Field | What the app says |
|---|---|---|
| `WHY/malaria` | The passage | This is the clearest example in medicine of why the same pathogen needs different defences at different moments. The RTS,S malaria vaccine targets the travelling sporozoite precisely because that brief window is when antibodies can act at all. |

### Why you must vaccinate on Normal and Hard

| Claim id | Field | What the app says |
|---|---|---|
| `WHY/vaccines` | The passage | On the harder modes the game forces the real public-health lesson: waiting to catch a disease is a terrible strategy. A vaccine gives you the memory without the illness, and paying 5 Action Points before an outbreak is far cheaper than fighting it twice. |

### Why Pathogen X takes so long to answer

| Claim id | Field | What the app says |
|---|---|---|
| `WHY/pathogenX` | The passage | This is clonal selection, and the delay is the point: it is precisely why a genuinely new virus is so dangerous. Your body is not missing the tools; it is searching a library of a hundred million receptor shapes for the one that fits. |

## Part 8 — General statements about how the body works

Sentences from How to play that explain immunology in general rather than describing one disease, cell or pathogen. Rules text is filtered out aggressively, so this part is short by design: most of what How to play says about a particular cell or invader has already appeared under that subject in Parts 2 and 3.


### How to play

| Claim id | Field | What the app says |
|---|---|---|
| `TEXT/help.s1.p2` | s1.p2 | Each of you commands one immune cell. Alone, every cell is nearly useless: the Monocyte cannot swallow a worm, the Killer T-Cell cannot touch a toxin, and the B-Cell's antibodies cannot reach anything hiding inside your own cells. Together, you can hold. |
| `TEXT/help.s7.p1` | s7.p1 | An antibody only fits its own antigen class. Making the wrong one is wasted work. |
| `TEXT/help.s9.rare` | s9.rare | A few cards carry rarer events that fire at the end of a spread, such as a malaria relapse or shingles. The log names each one and says why. |

---

*696 claims: 560 diseases, 24 types, 65 cells, 6 classes, 7 organs, 16 events, 15 why, 3 elsewhere.*
