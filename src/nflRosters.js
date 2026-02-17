// nflRosters.js — 2025 NFL season starters
// Sources: PFF projected lineups (Jun 2025) + ESPN depth charts (Dec 2025 in-season updates)
// Key starters mapped to depth chart slots: QB1, RB1, WR1-3, TE1, LT-RT, DE1-2, DT1-2, LB1-3, CB1-2, SS, FS

const NFL_ROSTERS = {
  "Eagles": {
    QB1:"Jalen Hurts",RB1:"Saquon Barkley",WR1:"A.J. Brown",WR2:"DeVonta Smith",WR3:"Jahan Dotson",TE1:"Dallas Goedert",
    LT:"Jordan Mailata",LG:"Landon Dickerson",C:"Cam Jurgens",RG:"Tyler Steen",RT:"Lane Johnson",
    DE1:"Nolan Smith",DT1:"Jordan Davis",DT2:"Jalen Carter",DE2:"Bryce Huff",
    LB1:"Nakobe Dean",LB2:"Zack Baun",LB3:"Jalyx Hunt",CB1:"Cooper DeJean",CB2:"Quinyon Mitchell",SS:"Reed Blankenship",FS:"Sydney Brown"
  },
  "Ravens": {
    QB1:"Lamar Jackson",RB1:"Derrick Henry",WR1:"Zay Flowers",WR2:"DeAndre Hopkins",WR3:"Rashod Bateman",TE1:"Mark Andrews",
    LT:"Ronnie Stanley",LG:"Andrew Vorhees",C:"Tyler Linderbaum",RG:"Daniel Faalele",RT:"Roger Rosengarten",
    DE1:"Kyle Van Noy",DT1:"Nnamdi Madubuike",DT2:"Travis Jones",DE2:"Odafe Oweh",
    LB1:"Roquan Smith",LB2:"Trenton Simpson",LB3:"Kyle Hamilton",CB1:"Marlon Humphrey",CB2:"Nate Wiggins",SS:"Kyle Hamilton",FS:"Malaki Starks"
  },
  "Lions": {
    QB1:"Jared Goff",RB1:"Jahmyr Gibbs",WR1:"Amon-Ra St. Brown",WR2:"Jameson Williams",WR3:"Tim Patrick",TE1:"Sam LaPorta",
    LT:"Taylor Decker",LG:"Graham Glasgow",C:"Frank Ragnow",RG:"Christian Mahogany",RT:"Penei Sewell",
    DE1:"Aidan Hutchinson",DT1:"Alim McNeill",DT2:"DJ Reader",DE2:"Marcus Davenport",
    LB1:"Jack Campbell",LB2:"Alex Anzalone",LB3:"Derrick Barnes",CB1:"Terrion Arnold",CB2:"D.J. Reed",SS:"Brian Branch",FS:"Kerby Joseph"
  },
  "Chiefs": {
    QB1:"Patrick Mahomes",RB1:"Isiah Pacheco",WR1:"Rashee Rice",WR2:"Xavier Worthy",WR3:"Marquise Brown",TE1:"Travis Kelce",
    LT:"Josh Simmons",LG:"Kingsley Suamataia",C:"Creed Humphrey",RG:"Trey Smith",RT:"Jawaan Taylor",
    DE1:"George Karlaftis",DT1:"Chris Jones",DT2:"Mike Pennel",DE2:"Mike Danna",
    LB1:"Nick Bolton",LB2:"Drue Tranquill",LB3:"Leo Chenal",CB1:"Trent McDuffie",CB2:"Jaylen Watson",SS:"Chamarri Conner",FS:"Bryan Cook"
  },
  "Bills": {
    QB1:"Josh Allen",RB1:"James Cook",WR1:"Khalil Shakir",WR2:"Keon Coleman",WR3:"Joshua Palmer",TE1:"Dawson Knox",
    LT:"Dion Dawkins",LG:"David Edwards",C:"Connor McGovern",RG:"O'Cyrus Torrence",RT:"Spencer Brown",
    DE1:"Greg Rousseau",DT1:"Ed Oliver",DT2:"DaQuan Jones",DE2:"Joey Bosa",
    LB1:"Matt Milano",LB2:"Terrel Bernard",LB3:"Dorian Williams",CB1:"Christian Benford",CB2:"Taron Johnson",SS:"Taylor Rapp",FS:"Damar Hamlin"
  },
  "Rams": {
    QB1:"Matthew Stafford",RB1:"Kyren Williams",WR1:"Puka Nacua",WR2:"Davante Adams",WR3:"Demarcus Robinson",TE1:"Tyler Higbee",
    LT:"Alaric Jackson",LG:"Steve Avila",C:"Coleman Shelton",RG:"Kevin Dotson",RT:"Rob Havenstein",
    DE1:"Jared Verse",DT1:"Kobie Turner",DT2:"Braden Fiske",DE2:"Byron Young",
    LB1:"Omar Speights",LB2:"Troy Reeder",LB3:"Christian Rozeboom",CB1:"Darious Williams",CB2:"Ahkello Witherspoon",SS:"Kamren Curl",FS:"Kamren Kinchens"
  },
  "Texans": {
    QB1:"C.J. Stroud",RB1:"Joe Mixon",WR1:"Nico Collins",WR2:"Christian Kirk",WR3:"John Metchie III",TE1:"Dalton Schultz",
    LT:"Cam Robinson",LG:"Tytus Howard",C:"Jarrett Patterson",RG:"Juice Scruggs",RT:"Blake Fisher",
    DE1:"Will Anderson Jr.",DT1:"Tim Settle",DT2:"Folorunso Fatukasi",DE2:"Danielle Hunter",
    LB1:"Azeez Al-Shaair",LB2:"Henry To'oTo'o",LB3:"Christian Harris",CB1:"Derek Stingley Jr.",CB2:"Kamari Lassiter",SS:"C.J. Gardner-Johnson",FS:"Calen Bullock"
  },
  "Vikings": {
    QB1:"J.J. McCarthy",RB1:"Aaron Jones",WR1:"Justin Jefferson",WR2:"Jordan Addison",WR3:"Jalen Nailor",TE1:"T.J. Hockenson",
    LT:"Christian Darrisaw",LG:"Donovan Jackson",C:"Ryan Kelly",RG:"Will Fries",RT:"Brian O'Neill",
    DE1:"Jonathan Greenard",DT1:"Jonathan Allen",DT2:"Javon Hargrave",DE2:"Andrew Van Ginkel",
    LB1:"Ivan Pace Jr.",LB2:"Blake Cashman",LB3:"Dallas Turner",CB1:"Byron Murphy Jr.",CB2:"Isaiah Rodgers",SS:"Harrison Smith",FS:"Josh Metellus"
  },
  "Broncos": {
    QB1:"Bo Nix",RB1:"RJ Harvey",WR1:"Courtland Sutton",WR2:"Devaughn Vele",WR3:"Marvin Mims Jr.",TE1:"Evan Engram",
    LT:"Garett Bolles",LG:"Ben Powers",C:"Luke Wattenberg",RG:"Quinn Meinerz",RT:"Mike McGlinchey",
    DE1:"Nik Bonitto",DT1:"John Franklin-Myers",DT2:"D.J. Jones",DE2:"Jonathon Cooper",
    LB1:"Dre Greenlaw",LB2:"Alex Singleton",LB3:"Jahdae Barron",CB1:"Pat Surtain II",CB2:"Riley Moss",SS:"Brandon Jones",FS:"Talanoa Hufanga"
  },
  "Buccaneers": {
    QB1:"Baker Mayfield",RB1:"Bucky Irving",WR1:"Mike Evans",WR2:"Chris Godwin",WR3:"Jalen McMillan",TE1:"Cade Otton",
    LT:"Tristan Wirfs",LG:"Ben Bredeson",C:"Graham Barton",RG:"Cody Mauch",RT:"Luke Goedeke",
    DE1:"Yaya Diaby",DT1:"Vita Vea",DT2:"Calijah Kancey",DE2:"Haason Reddick",
    LB1:"Lavonte David",LB2:"Anthony Walker",LB3:"K.J. Britt",CB1:"Jamel Dean",CB2:"Zyon McCollum",SS:"Antoine Winfield Jr.",FS:"Christian Izien"
  },
  "Commanders": {
    QB1:"Jayden Daniels",RB1:"Brian Robinson Jr.",WR1:"Terry McLaurin",WR2:"Deebo Samuel",WR3:"Noah Brown",TE1:"Zach Ertz",
    LT:"Laremy Tunsil",LG:"Nick Allegretti",C:"Tyler Biadasz",RG:"Sam Cosmi",RT:"Andrew Wylie",
    DE1:"Dorance Armstrong",DT1:"Daron Payne",DT2:"Jer'Zhan Newton",DE2:"Deatrich Wise Jr.",
    LB1:"Bobby Wagner",LB2:"Frankie Luvu",LB3:"Jamin Davis",CB1:"Marshon Lattimore",CB2:"Mike Sainristil",SS:"Quan Martin",FS:"Will Harris"
  },
  "Chargers": {
    QB1:"Justin Herbert",RB1:"Omarion Hampton",WR1:"Ladd McConkey",WR2:"Mike Williams",WR3:"Tre Harris",TE1:"Will Dissly",
    LT:"Rashawn Slater",LG:"Zion Johnson",C:"Bradley Bozeman",RG:"Mekhi Becton",RT:"Joe Alt",
    DE1:"Khalil Mack",DT1:"Da'Shawn Hand",DT2:"Teair Tart",DE2:"Tuli Tuipulotu",
    LB1:"Daiyan Henley",LB2:"Junior Colson",LB3:"Kenneth Murray Jr.",CB1:"Cam Hart",CB2:"Tarheeb Still",SS:"Derwin James Jr.",FS:"Alohi Gilman"
  },
  "Packers": {
    QB1:"Jordan Love",RB1:"Josh Jacobs",WR1:"Romeo Doubs",WR2:"Jayden Reed",WR3:"Matthew Golden",TE1:"Tucker Kraft",
    LT:"Rasheed Walker",LG:"Aaron Banks",C:"Elgton Jenkins",RG:"Sean Rhyan",RT:"Zach Tom",
    DE1:"Rashan Gary",DT1:"Kenny Clark",DT2:"Devonte Wyatt",DE2:"Kingsley Enagbare",
    LB1:"Edgerrin Cooper",LB2:"Quay Walker",LB3:"Lukas Van Ness",CB1:"Jaire Alexander",CB2:"Nate Hobbs",SS:"Xavier McKinney",FS:"Evan Williams"
  },
  "49ers": {
    QB1:"Brock Purdy",RB1:"Christian McCaffrey",WR1:"Jauan Jennings",WR2:"Brandon Aiyuk",WR3:"Ricky Pearsall",TE1:"George Kittle",
    LT:"Trent Williams",LG:"Ben Bartch",C:"Jake Brendel",RG:"Dominick Puni",RT:"Colton McKivitz",
    DE1:"Nick Bosa",DT1:"Jordan Elliott",DT2:"Alfred Collins",DE2:"Mykel Williams",
    LB1:"Fred Warner",LB2:"Dee Winters",LB3:"Dre Greenlaw",CB1:"Deommodore Lenoir",CB2:"Renardo Green",SS:"Malik Mustapha",FS:"Ji'Ayir Brown"
  },
  "Cowboys": {
    QB1:"Dak Prescott",RB1:"Javonte Williams",WR1:"CeeDee Lamb",WR2:"George Pickens",WR3:"Jalen Tolbert",TE1:"Jake Ferguson",
    LT:"Tyler Guyton",LG:"Tyler Smith",C:"Cooper Beebe",RG:"Tyler Booker",RT:"Terence Steele",
    DE1:"Micah Parsons",DT1:"Osa Odighizuwa",DT2:"Mazi Smith",DE2:"Dante Fowler Jr.",
    LB1:"DeMarvion Overshown",LB2:"Kenneth Murray Jr.",LB3:"Marshawn Kneeland",CB1:"Trevon Diggs",CB2:"DaRon Bland",SS:"Malik Hooker",FS:"Donovan Wilson"
  },
  "Falcons": {
    QB1:"Kirk Cousins",RB1:"Bijan Robinson",WR1:"Drake London",WR2:"Darnell Mooney",WR3:"Ray-Ray McCloud",TE1:"Kyle Pitts",
    LT:"Jake Matthews",LG:"Matthew Bergeron",C:"Ryan Neuzil",RG:"Chris Lindstrom",RT:"Kaleb McGary",
    DE1:"Arnold Ebiketie",DT1:"David Onyemata",DT2:"Morgan Fox",DE2:"James Pearce Jr.",
    LB1:"Kaden Elliss",LB2:"Jalon Walker",LB3:"Troy Andersen",CB1:"A.J. Terrell",CB2:"Dee Alford",SS:"Jessie Bates III",FS:"Xavier Watts"
  },
  "Bears": {
    QB1:"Caleb Williams",RB1:"Roschon Johnson",WR1:"D.J. Moore",WR2:"Luther Burden III",WR3:"Rome Odunze",TE1:"Cole Kmet",
    LT:"Braxton Jones",LG:"Joe Thuney",C:"Drew Dalman",RG:"Jonah Jackson",RT:"Darnell Wright",
    DE1:"Montez Sweat",DT1:"Grady Jarrett",DT2:"Gervon Dexter Sr.",DE2:"Dayo Odeyingbo",
    LB1:"Tremaine Edmunds",LB2:"T.J. Edwards",LB3:"Austin Booker",CB1:"Jaylon Johnson",CB2:"Tyrique Stevenson",SS:"Jaquan Brisker",FS:"Kevin Byard"
  },
  "Bengals": {
    QB1:"Joe Burrow",RB1:"Chase Brown",WR1:"Ja'Marr Chase",WR2:"Tee Higgins",WR3:"Andrei Iosivas",TE1:"Mike Gesicki",
    LT:"Orlando Brown Jr.",LG:"Cordell Volson",C:"Ted Karras",RG:"Cody Ford",RT:"Amarius Mims",
    DE1:"Trey Hendrickson",DT1:"B.J. Hill",DT2:"T.J. Slaton",DE2:"Shemar Stewart",
    LB1:"Germaine Pratt",LB2:"Logan Wilson",LB3:"Joseph Ossai",CB1:"Cam Taylor-Britt",CB2:"DJ Turner II",SS:"Geno Stone",FS:"Jordan Battle"
  },
  "Cardinals": {
    QB1:"Kyler Murray",RB1:"James Conner",WR1:"Marvin Harrison Jr.",WR2:"Michael Wilson",WR3:"Greg Dortch",TE1:"Trey McBride",
    LT:"Paris Johnson Jr.",LG:"Evan Brown",C:"Hjalte Froholdt",RG:"Isaiah Adams",RT:"Jonah Williams",
    DE1:"Josh Sweat",DT1:"Calais Campbell",DT2:"Darius Robinson",DE2:"Zaven Collins",
    LB1:"Mack Wilson Sr.",LB2:"Baron Browning",LB3:"Akeem Davis-Gaither",CB1:"Will Johnson",CB2:"Garrett Williams",SS:"Budda Baker",FS:"Jalen Thompson"
  },
  "Colts": {
    QB1:"Anthony Richardson",RB1:"Jonathan Taylor",WR1:"Michael Pittman Jr.",WR2:"Josh Downs",WR3:"Alec Pierce",TE1:"Tyler Warren",
    LT:"Bernhard Raimann",LG:"Quenton Nelson",C:"Tanor Bortolini",RG:"Matt Goncalves",RT:"Braden Smith",
    DE1:"Laiatu Latu",DT1:"DeForest Buckner",DT2:"Grover Stewart",DE2:"Kwity Paye",
    LB1:"Zaire Franklin",LB2:"Jaylon Carlies",LB3:"E.J. Speed",CB1:"Charvarius Ward",CB2:"Jaylon Jones",SS:"Cam Bynum",FS:"Nick Cross"
  },
  "Jaguars": {
    QB1:"Trevor Lawrence",RB1:"Travis Etienne Jr.",WR1:"Brian Thomas Jr.",WR2:"Travis Hunter",WR3:"Dyami Brown",TE1:"Brenton Strange",
    LT:"Walker Little",LG:"Ezra Cleveland",C:"Robert Hainsey",RG:"Patrick Mekari",RT:"Anton Harrison",
    DE1:"Josh Hines-Allen",DT1:"DaVon Hamilton",DT2:"Maason Smith",DE2:"Travon Walker",
    LB1:"Devin Lloyd",LB2:"Foyesade Oluokun",LB3:"Ventrell Miller",CB1:"Tyson Campbell",CB2:"Jarrian Jones",SS:"Darnell Savage",FS:"Eric Murray"
  },
  "Raiders": {
    QB1:"Geno Smith",RB1:"Ashton Jeanty",WR1:"Tre Tucker",WR2:"Tyler Lockett",WR3:"Dont'e Thornton Jr.",TE1:"Brock Bowers",
    LT:"Stone Forsythe",LG:"Dylan Parham",C:"Will Putnam",RG:"Jordan Meredith",RT:"DJ Glaze",
    DE1:"Maxx Crosby",DT1:"Jonah Laulu",DT2:"Adam Butler",DE2:"Malcolm Koonce",
    LB1:"Elandon Roberts",LB2:"Devin White",LB3:"Tommy Eichenberg",CB1:"Kyu Blu Kelly",CB2:"Eric Stokes",SS:"Jeremy Chinn",FS:"Isaiah Pola-Mao"
  },
  "Dolphins": {
    QB1:"Tua Tagovailoa",RB1:"De'Von Achane",WR1:"Jaylen Waddle",WR2:"Malik Washington",WR3:"River Cracraft",TE1:"Jonnu Smith",
    LT:"Patrick Paul",LG:"James Daniels",C:"Aaron Brewer",RG:"Jonah Savaiinaea",RT:"Austin Jackson",
    DE1:"Jaelan Phillips",DT1:"Zach Sieler",DT2:"Kenneth Grant",DE2:"Bradley Chubb",
    LB1:"Jordyn Brooks",LB2:"Tyrel Dodson",LB3:"David Long Jr.",CB1:"Jalen Ramsey",CB2:"Kader Kohou",SS:"Jevon Holland",FS:"Ifeatu Melifonwu"
  },
  "Patriots": {
    QB1:"Drake Maye",RB1:"Rhamondre Stevenson",WR1:"Stefon Diggs",WR2:"Demario Douglas",WR3:"Mack Hollins",TE1:"Hunter Henry",
    LT:"Will Campbell",LG:"Cole Strange",C:"Garrett Bradbury",RG:"Mike Onwenu",RT:"Morgan Moses",
    DE1:"Harold Landry III",DT1:"Milton Williams",DT2:"Christian Barmore",DE2:"Anfernee Jennings",
    LB1:"Robert Spillane",LB2:"Christian Elliss",LB3:"Marte Mapu",CB1:"Christian Gonzalez",CB2:"Carlton Davis III",SS:"Kyle Dugger",FS:"Jabrill Peppers"
  },
  "Saints": {
    QB1:"Tyler Shough",RB1:"Alvin Kamara",WR1:"Chris Olave",WR2:"Devaughn Vele",WR3:"Mason Tipton",TE1:"Juwan Johnson",
    LT:"Kelvin Banks Jr.",LG:"Torricelli Simpkins III",C:"Luke Fortner",RG:"Cesar Ruiz",RT:"Taliese Fuaga",
    DE1:"Cameron Jordan",DT1:"Davon Godchaux",DT2:"Bryan Bresee",DE2:"Carl Granderson",
    LB1:"Demario Davis",LB2:"Pete Werner",LB3:"Danny Stutsman",CB1:"Paulson Adebo",CB2:"Kool-Aid McKinstry",SS:"Tyrann Mathieu",FS:"Jordan Howden"
  },
  "Giants": {
    QB1:"Russell Wilson",RB1:"Tyrone Tracy",WR1:"Malik Nabers",WR2:"Darius Slayton",WR3:"Wan'Dale Robinson",TE1:"Theo Johnson",
    LT:"Andrew Thomas",LG:"Jon Runyan",C:"John Michael Schmitz",RG:"Greg Van Roten",RT:"Jermaine Eluemunor",
    DE1:"Kayvon Thibodeaux",DT1:"Dexter Lawrence",DT2:"Roy Robertson-Harris",DE2:"Brian Burns",
    LB1:"Bobby Okereke",LB2:"Micah McFadden",LB3:"Abdul Carter",CB1:"Paulson Adebo",CB2:"Deonte Banks",SS:"Tyler Nubin",FS:"Jevon Holland"
  },
  "Jets": {
    QB1:"Justin Fields",RB1:"Breece Hall",WR1:"Garrett Wilson",WR2:"Allen Lazard",WR3:"Josh Reynolds",TE1:"Mason Taylor",
    LT:"Olu Fashanu",LG:"John Simpson",C:"Joe Tippmann",RG:"Alijah Vera-Tucker",RT:"Armand Membou",
    DE1:"Jermaine Johnson",DT1:"Quinnen Williams",DT2:"Derrick Nnadi",DE2:"Will McDonald IV",
    LB1:"Quincy Williams",LB2:"Jamien Sherwood",LB3:"C.J. Mosley",CB1:"Sauce Gardner",CB2:"Brandon Stephens",SS:"Tony Adams",FS:"Andre Cisco"
  },
  "Steelers": {
    QB1:"Mason Rudolph",RB1:"Kaleb Johnson",WR1:"D.K. Metcalf",WR2:"Calvin Austin III",WR3:"Robert Woods",TE1:"Pat Freiermuth",
    LT:"Broderick Jones",LG:"Isaac Seumalo",C:"Zach Frazier",RG:"Mason McCormick",RT:"Troy Fautanu",
    DE1:"T.J. Watt",DT1:"Cameron Heyward",DT2:"Keeanu Benton",DE2:"Alex Highsmith",
    LB1:"Patrick Queen",LB2:"Payton Wilson",LB3:"Elandon Roberts",CB1:"Darius Slay",CB2:"Joey Porter Jr.",SS:"Minkah Fitzpatrick",FS:"DeShon Elliott"
  },
  "Seahawks": {
    QB1:"Sam Darnold",RB1:"Kenneth Walker III",WR1:"Jaxon Smith-Njigba",WR2:"Cooper Kupp",WR3:"Marquez Valdes-Scantling",TE1:"Noah Fant",
    LT:"Charles Cross",LG:"Grey Zabel",C:"Olu Oluwatimi",RG:"Christian Haynes",RT:"Abraham Lucas",
    DE1:"Uchenna Nwosu",DT1:"Leonard Williams",DT2:"Byron Murphy II",DE2:"DeMarcus Lawrence",
    LB1:"Boye Mafe",LB2:"Ernest Jones",LB3:"Tyrice Knight",CB1:"Devon Witherspoon",CB2:"Riq Woolen",SS:"Coby Bryant",FS:"Julian Love"
  },
  "Panthers": {
    QB1:"Bryce Young",RB1:"Chuba Hubbard",WR1:"Xavier Legette",WR2:"Adam Thielen",WR3:"Tetairoa McMillan",TE1:"Tommy Tremble",
    LT:"Ikem Ekwonu",LG:"Damien Lewis",C:"Austin Corbett",RG:"Robert Hunt",RT:"Taylor Moton",
    DE1:"D.J. Wonnum",DT1:"Derrick Brown",DT2:"Tershawn Wharton",DE2:"Pat Jones II",
    LB1:"Josey Jewell",LB2:"Trevin Wallace",LB3:"Shaq Thompson",CB1:"Jaycee Horn",CB2:"Mike Jackson",SS:"Demani Richardson",FS:"Tre'von Moehrig"
  },
  "Titans": {
    QB1:"Cam Ward",RB1:"Tony Pollard",WR1:"Calvin Ridley",WR2:"Tyler Lockett",WR3:"Van Jefferson",TE1:"Chigoziem Okonkwo",
    LT:"Dan Moore Jr.",LG:"Peter Skoronski",C:"Lloyd Cushenberry III",RG:"Kevin Zeitler",RT:"JC Latham",
    DE1:"Arden Key",DT1:"Jeffery Simmons",DT2:"T'Vondre Sweat",DE2:"Dre'Mont Jones",
    LB1:"Cody Barton",LB2:"Otis Reese IV",LB3:"Ernest Jones IV",CB1:"L'Jarius Sneed",CB2:"Roger McCreary",SS:"Amani Hooker",FS:"Xavier Woods"
  },
  "Browns": {
    QB1:"Shedeur Sanders",RB1:"Quinshon Judkins",WR1:"Jerry Jeudy",WR2:"Cedric Tillman",WR3:"Jamari Thrash",TE1:"David Njoku",
    LT:"Dawand Jones",LG:"Joel Bitonio",C:"Ethan Pocic",RG:"Wyatt Teller",RT:"Jack Conklin",
    DE1:"Myles Garrett",DT1:"Mason Graham",DT2:"Maliek Collins",DE2:"Isaiah McGuire",
    LB1:"Jordan Hicks",LB2:"Carson Schwesinger",LB3:"Jeremiah Owusu-Koramoah",CB1:"Denzel Ward",CB2:"Martin Emerson Jr.",SS:"Grant Delpit",FS:"Ronnie Hickman Jr."
  },
};

export default NFL_ROSTERS;
