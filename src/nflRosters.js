// nflRosters.js — Current NFL starters for 2026 draft context
// Based on end-of-2025 season rosters (post-Super Bowl LX)
// Key starters only: QB, RB, WR1-3, TE, LT, LG, C, RG, RT, DE1, DT1, DT2, DE2, LB1-3, CB1-2, SS, FS
// Format: { slot: "Player Name" } — maps to depth chart slots

const NFL_ROSTERS = {
  "Raiders": {
    QB1:"Geno Smith",RB1:"Ashton Jeanty",
    WR1:"Tyler Lockett",WR2:"Jakobi Meyers",WR3:"Tre Tucker",
    TE1:"Brock Bowers",
    LT:"Kolton Miller",LG:"Jordan Meredith",C:"Andre James",RG:"Dylan Parham",RT:"Thayer Munford Jr.",
    DE1:"Maxx Crosby",DT1:"Adam Butler",DT2:"Jerry Tillery",DE2:"Tyree Wilson",
    LB1:"Robert Spillane",LB2:"Divine Deablo",LB3:"Luke Masterson",
    CB1:"Nate Hobbs",CB2:"Jakorian Bennett",SS:"Tre'von Moehrig",FS:"Marcus Epps"
  },
  "Jets": {
    QB1:"Aaron Rodgers",RB1:"Breece Hall",
    WR1:"Garrett Wilson",WR2:"Mike Williams",WR3:"Allen Lazard",
    TE1:"Tyler Conklin",
    LT:"Tyron Smith",LG:"John Simpson",C:"Connor McGovern",RG:"Alijah Vera-Tucker",RT:"Morgan Moses",
    DE1:"Jermaine Johnson II",DT1:"Quinnen Williams",DT2:"Javon Kinlaw",DE2:"Will McDonald IV",
    LB1:"Quincy Williams",LB2:"C.J. Mosley",LB3:"Jamien Sherwood",
    CB1:"Sauce Gardner",CB2:"D.J. Reed",SS:"Tony Adams",FS:"Chuck Clark"
  },
  "Cardinals": {
    QB1:"Kyler Murray",RB1:"James Conner",
    WR1:"Marvin Harrison Jr.",WR2:"Trey McBride",WR3:"Greg Dortch",
    TE1:"Trey McBride",
    LT:"Paris Johnson Jr.",LG:"Evan Brown",C:"Hjalte Froholdt",RG:"Will Hernandez",RT:"Kelvin Beachum",
    DE1:"Jonathan Ledbetter",DT1:"Bilal Nichols",DT2:"Darius Robinson",DE2:"L.J. Collier",
    LB1:"Kyzir White",LB2:"Zaven Collins",LB3:"Mack Wilson Sr.",
    CB1:"Sean Murphy-Bunting",CB2:"Garrett Williams",SS:"Budda Baker",FS:"Jalen Thompson"
  },
  "Titans": {
    QB1:"Will Levis",RB1:"Tony Pollard",
    WR1:"Calvin Ridley",WR2:"DeAndre Hopkins",WR3:"Tyler Boyd",
    TE1:"Chig Okonkwo",
    LT:"JC Latham",LG:"Peter Skoronski",C:"Lloyd Cushenberry III",RG:"Dillon Radunz",RT:"Nicholas Petit-Frere",
    DE1:"Harold Landry III",DT1:"Jeffery Simmons",DT2:"Sebastian Joseph-Day",DE2:"Arden Key",
    LB1:"Kenneth Murray Jr.",LB2:"Ernest Jones IV",LB3:"Jack Gibbens",
    CB1:"L'Jarius Sneed",CB2:"Roger McCreary",SS:"Amani Hooker",FS:"Quandre Diggs"
  },
  "Giants": {
    QB1:"Jaxson Dart",RB1:"Tyrone Tracy Jr.",
    WR1:"Malik Nabers",WR2:"Wan'Dale Robinson",WR3:"Darius Slayton",
    TE1:"Theo Johnson",
    LT:"Andrew Thomas",LG:"Jon Runyan Jr.",C:"John Michael Schmitz Jr.",RG:"Greg Van Roten",RT:"Jermaine Eluemunor",
    DE1:"Kayvon Thibodeaux",DT1:"Dexter Lawrence",DT2:"Rakeem Nunez-Roches",DE2:"Brian Burns",
    LB1:"Bobby Okereke",LB2:"Micah McFadden",LB3:"Darius Muasau",
    CB1:"Deonte Banks",CB2:"Cor'Dale Flott",SS:"Jason Pinnock",FS:"Tyler Nubin"
  },
  "Browns": {
    QB1:"Jameis Winston",RB1:"Jerome Ford",
    WR1:"Jerry Jeudy",WR2:"Elijah Moore",WR3:"Cedric Tillman",
    TE1:"David Njoku",
    LT:"Jedrick Wills Jr.",LG:"Joel Bitonio",C:"Ethan Pocic",RG:"Wyatt Teller",RT:"Jack Conklin",
    DE1:"Myles Garrett",DT1:"Dalvin Tomlinson",DT2:"Shelby Harris",DE2:"Za'Darius Smith",
    LB1:"Jeremiah Owusu-Koramoah",LB2:"Jordan Hicks",LB3:"Devin Bush",
    CB1:"Denzel Ward",CB2:"Martin Emerson Jr.",SS:"Grant Delpit",FS:"Juan Thornhill"
  },
  "Commanders": {
    QB1:"Jayden Daniels",RB1:"Brian Robinson Jr.",
    WR1:"Terry McLaurin",WR2:"Jahan Dotson",WR3:"Dyami Brown",
    TE1:"Zach Ertz",
    LT:"Brandon Coleman",LG:"Nick Allegretti",C:"Tyler Biadasz",RG:"Sam Cosmi",RT:"Andrew Wylie",
    DE1:"Chase Young",DT1:"Daron Payne",DT2:"Jonathan Allen",DE2:"Clelin Ferrell",
    LB1:"Frankie Luvu",LB2:"Bobby Wagner",LB3:"Jamin Davis",
    CB1:"Marshon Lattimore",CB2:"Mike Sainristil",SS:"Jeremy Chinn",FS:"Quan Martin"
  },
  "Saints": {
    QB1:"Derek Carr",RB1:"Alvin Kamara",
    WR1:"Chris Olave",WR2:"Rashid Shaheed",WR3:"A.T. Perry",
    TE1:"Juwan Johnson",
    LT:"Trevor Penning",LG:"Lucas Patrick",C:"Erik McCoy",RG:"Cesar Ruiz",RT:"Ryan Ramczyk",
    DE1:"Chase Jordan",DT1:"Bryan Bresee",DT2:"Khalen Saunders",DE2:"Carl Granderson",
    LB1:"Demario Davis",LB2:"Pete Werner",LB3:"Willie Gay Jr.",
    CB1:"Paulson Adebo",CB2:"Alontae Taylor",SS:"Tyrann Mathieu",FS:"Jordan Howden"
  },
  "Chiefs": {
    QB1:"Patrick Mahomes",RB1:"Isiah Pacheco",
    WR1:"Xavier Worthy",WR2:"Marquise Brown",WR3:"Kadarius Toney",
    TE1:"Travis Kelce",
    LT:"D.J. Humphries",LG:"Joe Thuney",C:"Creed Humphrey",RG:"Trey Smith",RT:"Jawaan Taylor",
    DE1:"George Karlaftis",DT1:"Chris Jones",DT2:"Derrick Nnadi",DE2:"Charles Omenihu",
    LB1:"Nick Bolton",LB2:"Leo Chenal",LB3:"Drue Tranquill",
    CB1:"Trent McDuffie",CB2:"Nazeeh Johnson",SS:"Justin Reid",FS:"Bryan Cook"
  },
  "Bengals": {
    QB1:"Joe Burrow",RB1:"Zack Moss",
    WR1:"Ja'Marr Chase",WR2:"Tee Higgins",WR3:"Andrei Iosivas",
    TE1:"Mike Gesicki",
    LT:"Orlando Brown Jr.",LG:"Cordell Volson",C:"Ted Karras",RG:"Alex Cappa",RT:"Amarius Mims",
    DE1:"Trey Hendrickson",DT1:"B.J. Hill",DT2:"Sheldon Rankins",DE2:"Sam Hubbard",
    LB1:"Germaine Pratt",LB2:"Logan Wilson",LB3:"Akeem Davis-Gaither",
    CB1:"Cam Taylor-Britt",CB2:"DJ Turner II",SS:"Vonn Bell",FS:"Geno Stone"
  },
  "Dolphins": {
    QB1:"Tua Tagovailoa",RB1:"De'Von Achane",
    WR1:"Jaylen Waddle",WR2:"Odell Beckham Jr.",WR3:"River Cracraft",
    TE1:"Jonnu Smith",
    LT:"Terron Armstead",LG:"Robert Jones",C:"Aaron Brewer",RG:"Robert Hunt",RT:"Austin Jackson",
    DE1:"Jaelan Phillips",DT1:"Calais Campbell",DT2:"Zach Sieler",DE2:"Emmanuel Ogbah",
    LB1:"Bradley Chubb",LB2:"David Long Jr.",LB3:"Andrew Van Ginkel",
    CB1:"Jalen Ramsey",CB2:"Kader Kohou",SS:"Jevon Holland",FS:"Jordan Poyer"
  },
  "Cowboys": {
    QB1:"Dak Prescott",RB1:"Rico Dowdle",
    WR1:"CeeDee Lamb",WR2:"Brandin Cooks",WR3:"Jalen Tolbert",
    TE1:"Jake Ferguson",
    LT:"Tyler Guyton",LG:"Tyler Smith",C:"Brock Hoffman",RG:"Zack Martin",RT:"Terence Steele",
    DE1:"DeMarcus Lawrence",DT1:"Osa Odighizuwa",DT2:"Mazi Smith",DE2:"Micah Parsons",
    LB1:"DeMarvion Overshown",LB2:"Eric Kendricks",LB3:"Damone Clark",
    CB1:"Trevon Diggs",CB2:"DaRon Bland",SS:"Malik Hooker",FS:"Donovan Wilson"
  },
  "Rams": {
    QB1:"Matthew Stafford",RB1:"Kyren Williams",
    WR1:"Puka Nacua",WR2:"Cooper Kupp",WR3:"Demarcus Robinson",
    TE1:"Tyler Higbee",
    LT:"Alaric Jackson",LG:"Steve Avila",C:"Brian Allen",RG:"Kevin Dotson",RT:"Rob Havenstein",
    DE1:"Jared Verse",DT1:"Kobie Turner",DT2:"Bobby Brown III",DE2:"Byron Young",
    LB1:"Christian Rozeboom",LB2:"Troy Reeder",LB3:"Ernest Jones IV",
    CB1:"Darious Williams",CB2:"Tre'Davious White",SS:"Kam Curl",FS:"Quentin Lake"
  },
  "Ravens": {
    QB1:"Lamar Jackson",RB1:"Derrick Henry",
    WR1:"Zay Flowers",WR2:"Rashod Bateman",WR3:"Nelson Agholor",
    TE1:"Mark Andrews",
    LT:"Ronnie Stanley",LG:"Andrew Vorhees",C:"Tyler Linderbaum",RG:"Ben Cleveland",RT:"Roger Rosengarten",
    DE1:"Kyle Van Noy",DT1:"Nnamdi Madubuike",DT2:"Michael Pierce",DE2:"Odafe Oweh",
    LB1:"Roquan Smith",LB2:"Trenton Simpson",LB3:"Patrick Queen",
    CB1:"Marlon Humphrey",CB2:"Brandon Stephens",SS:"Kyle Hamilton",FS:"Marcus Williams"
  },
  "Buccaneers": {
    QB1:"Baker Mayfield",RB1:"Rachaad White",
    WR1:"Mike Evans",WR2:"Chris Godwin",WR3:"Jalen McMillan",
    TE1:"Cade Otton",
    LT:"Tristan Wirfs",LG:"Luke Goedeke",C:"Graham Barton",RG:"Cody Mauch",RT:"Luke Goedeke",
    DE1:"Yaya Diaby",DT1:"Vita Vea",DT2:"Logan Hall",DE2:"Joe Tryon-Shoyinka",
    LB1:"Lavonte David",LB2:"Devin White",LB3:"SirVocea Dennis",
    CB1:"Jamel Dean",CB2:"Zyon McCollum",SS:"Antoine Winfield Jr.",FS:"Jordan Whitehead"
  },
  "Lions": {
    QB1:"Jared Goff",RB1:"Jahmyr Gibbs",
    WR1:"Amon-Ra St. Brown",WR2:"Jameson Williams",WR3:"Kalif Raymond",
    TE1:"Sam LaPorta",
    LT:"Taylor Decker",LG:"Graham Glasgow",C:"Frank Ragnow",RG:"Kevin Zeitler",RT:"Penei Sewell",
    DE1:"Aidan Hutchinson",DT1:"Alim McNeill",DT2:"D.J. Reader",DE2:"Marcus Davenport",
    LB1:"Alex Anzalone",LB2:"Jack Campbell",LB3:"Derrick Barnes",
    CB1:"Terrion Arnold",CB2:"Carlton Davis III",SS:"Brian Branch",FS:"Kerby Joseph"
  },
  "Vikings": {
    QB1:"Sam Darnold",RB1:"Aaron Jones",
    WR1:"Justin Jefferson",WR2:"Jordan Addison",WR3:"Jalen Nailor",
    TE1:"T.J. Hockenson",
    LT:"Christian Darrisaw",LG:"Blake Brandel",C:"Garrett Bradbury",RG:"Ed Ingram",RT:"Brian O'Neill",
    DE1:"Jonathan Greenard",DT1:"Harrison Phillips",DT2:"Jerry Tillery",DE2:"Andrew Van Ginkel",
    LB1:"Ivan Pace Jr.",LB2:"Blake Cashman",LB3:"Brian Asamoah II",
    CB1:"Byron Murphy Jr.",CB2:"Shaquill Griffin",SS:"Cam Bynum",FS:"Harrison Smith"
  },
  "Panthers": {
    QB1:"Bryce Young",RB1:"Chuba Hubbard",
    WR1:"Diontae Johnson",WR2:"Adam Thielen",WR3:"Xavier Legette",
    TE1:"Tommy Tremble",
    LT:"Ikem Ekwonu",LG:"Damien Lewis",C:"Austin Corbett",RG:"Robert Hunt",RT:"Taylor Moton",
    DE1:"Jadeveon Clowney",DT1:"Derrick Brown",DT2:"A'Shawn Robinson",DE2:"D.J. Wonnum",
    LB1:"Shaq Thompson",LB2:"Josey Jewell",LB3:"Claudin Cherelus",
    CB1:"Jaycee Horn",CB2:"Dane Jackson",SS:"Xavier Woods",FS:"Nick Emmanwori"
  },
  "Steelers": {
    QB1:"Russell Wilson",RB1:"Najee Harris",
    WR1:"George Pickens",WR2:"Van Jefferson",WR3:"Calvin Austin III",
    TE1:"Pat Freiermuth",
    LT:"Dan Moore Jr.",LG:"Isaac Seumalo",C:"Nate Herbig",RG:"James Daniels",RT:"Broderick Jones",
    DE1:"T.J. Watt",DT1:"Cam Heyward",DT2:"Larry Ogunjobi",DE2:"Alex Highsmith",
    LB1:"Patrick Queen",LB2:"Elandon Roberts",LB3:"Cole Holcomb",
    CB1:"Joey Porter Jr.",CB2:"Donte Jackson",SS:"Minkah Fitzpatrick",FS:"DeShon Elliott"
  },
  "Chargers": {
    QB1:"Justin Herbert",RB1:"J.K. Dobbins",
    WR1:"Quentin Johnston",WR2:"Joshua Palmer",WR3:"Ladd McConkey",
    TE1:"Will Dissly",
    LT:"Rashawn Slater",LG:"Zion Johnson",C:"Bradley Bozeman",RG:"Jamaree Salyer",RT:"Trey Pipkins III",
    DE1:"Joey Bosa",DT1:"Poona Ford",DT2:"Austin Johnson",DE2:"Khalil Mack",
    LB1:"Daiyan Henley",LB2:"Kenneth Murray Jr.",LB3:"Troy Dye",
    CB1:"Asante Samuel Jr.",CB2:"Kristian Fulton",SS:"Derwin James",FS:"Alohi Gilman"
  },
  "Eagles": {
    QB1:"Jalen Hurts",RB1:"Saquon Barkley",
    WR1:"A.J. Brown",WR2:"DeVonta Smith",WR3:"Britain Covey",
    TE1:"Dallas Goedert",
    LT:"Jordan Mailata",LG:"Landon Dickerson",C:"Cam Jurgens",RG:"Mekhi Becton",RT:"Lane Johnson",
    DE1:"Josh Sweat",DT1:"Jalen Carter",DT2:"Jordan Davis",DE2:"Brandon Graham",
    LB1:"Zack Baun",LB2:"Nakobe Dean",LB3:"Oren Burks",
    CB1:"Darius Slay",CB2:"Quinyon Mitchell",SS:"C.J. Gardner-Johnson",FS:"Reed Blankenship"
  },
  "Bears": {
    QB1:"Caleb Williams",RB1:"D'Andre Swift",
    WR1:"DJ Moore",WR2:"Rome Odunze",WR3:"Keenan Allen",
    TE1:"Cole Kmet",
    LT:"Braxton Jones",LG:"Teven Jenkins",C:"Ryan Bates",RG:"Nate Davis",RT:"Darnell Wright",
    DE1:"Montez Sweat",DT1:"Gervon Dexter Sr.",DT2:"Andrew Billings",DE2:"DeMarcus Walker",
    LB1:"Tremaine Edmunds",LB2:"T.J. Edwards",LB3:"Jack Sanborn",
    CB1:"Jaylon Johnson",CB2:"Tyrique Stevenson",SS:"Kevin Byard",FS:"Jaquan Brisker"
  },
  "Bills": {
    QB1:"Josh Allen",RB1:"James Cook",
    WR1:"Khalil Shakir",WR2:"Curtis Samuel",WR3:"Mack Hollins",
    TE1:"Dalton Kincaid",
    LT:"Spencer Brown",LG:"David Edwards",C:"Connor McGovern",RG:"O'Cyrus Torrence",RT:"Ryan Van Demark",
    DE1:"Greg Rousseau",DT1:"Ed Oliver",DT2:"DaQuan Jones",DE2:"Von Miller",
    LB1:"Matt Milano",LB2:"Terrel Bernard",LB3:"Dorian Williams",
    CB1:"Rasul Douglas",CB2:"Taron Johnson",SS:"Taylor Rapp",FS:"Damar Hamlin"
  },
  "49ers": {
    QB1:"Brock Purdy",RB1:"Christian McCaffrey",
    WR1:"Deebo Samuel",WR2:"Brandon Aiyuk",WR3:"Jauan Jennings",
    TE1:"George Kittle",
    LT:"Trent Williams",LG:"Aaron Banks",C:"Jake Brendel",RG:"Dominick Puni",RT:"Colton McKivitz",
    DE1:"Nick Bosa",DT1:"Javon Hargrave",DT2:"Arik Armstead",DE2:"Leonard Floyd",
    LB1:"Fred Warner",LB2:"Dre Greenlaw",LB3:"De'Vondre Campbell",
    CB1:"Charvarius Ward",CB2:"Deommodore Lenoir",SS:"Talanoa Hufanga",FS:"Ji'Aire Brown"
  },
  "Texans": {
    QB1:"C.J. Stroud",RB1:"Joe Mixon",
    WR1:"Nico Collins",WR2:"Stefon Diggs",WR3:"Tank Dell",
    TE1:"Dalton Schultz",
    LT:"Laremy Tunsil",LG:"Kenyon Green",C:"Juice Scruggs",RG:"Shaq Mason",RT:"George Fant",
    DE1:"Will Anderson Jr.",DT1:"Foley Fatukasi",DT2:"Tim Settle",DE2:"Danielle Hunter",
    LB1:"Azeez Al-Shaair",LB2:"Henry To'oTo'o",LB3:"Christian Harris",
    CB1:"Derek Stingley Jr.",CB2:"Kamari Lassiter",SS:"Jimmie Ward",FS:"Jalen Pitre"
  },
  "Broncos": {
    QB1:"Bo Nix",RB1:"Javonte Williams",
    WR1:"Courtland Sutton",WR2:"Marvin Mims Jr.",WR3:"Troy Franklin",
    TE1:"Adam Trautman",
    LT:"Garett Bolles",LG:"Ben Powers",C:"Luke Wattenberg",RG:"Quinn Meinerz",RT:"Mike McGlinchey",
    DE1:"Zach Allen",DT1:"D.J. Jones",DT2:"Malcolm Roach",DE2:"Jonathon Cooper",
    LB1:"Nik Bonitto",LB2:"Alex Singleton",LB3:"Josey Jewell",
    CB1:"Pat Surtain II",CB2:"Riley Moss",SS:"Brandon Jones",FS:"P.J. Locke"
  },
  "Patriots": {
    QB1:"Drake Maye",RB1:"Rhamondre Stevenson",
    WR1:"Ja'Lynn Polk",WR2:"DeMario Douglas",WR3:"Jalen Reagor",
    TE1:"Hunter Henry",
    LT:"Vederian Lowe",LG:"Sidy Sow",C:"David Andrews",RG:"Mike Onwenu",RT:"Caedan Wallace",
    DE1:"Matthew Judon",DT1:"Davon Godchaux",DT2:"Daniel Ekuale",DE2:"Keion White",
    LB1:"Ja'Whaun Bentley",LB2:"Jahlani Tavai",LB3:"Marte Mapu",
    CB1:"Christian Gonzalez",CB2:"Jonathan Jones",SS:"Kyle Dugger",FS:"Jabrill Peppers"
  },
  "Seahawks": {
    QB1:"Geno Smith",RB1:"Kenneth Walker III",
    WR1:"DK Metcalf",WR2:"Tyler Lockett",WR3:"Jaxon Smith-Njigba",
    TE1:"Noah Fant",
    LT:"Charles Cross",LG:"Laken Tomlinson",C:"Olu Oluwatimi",RG:"Anthony Bradford",RT:"Abraham Lucas",
    DE1:"Uchenna Nwosu",DT1:"Leonard Williams",DT2:"Jarran Reed",DE2:"Dre'Mont Jones",
    LB1:"Boye Mafe",LB2:"Jerome Baker",LB3:"Tyrel Dodson",
    CB1:"Devon Witherspoon",CB2:"Riq Woolen",SS:"Julian Love",FS:"Rayshawn Jenkins"
  },
};

export default NFL_ROSTERS;
