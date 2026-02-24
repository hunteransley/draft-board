import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { supabase } from "./supabase.js";
import MockDraftSim from "./MockDraftSim.jsx";
import { CONSENSUS_BOARD, getConsensusRank, getConsensusGrade, TEAM_NEEDS_DETAILED } from "./consensusData.js";
import { getProspectStats } from "./prospectStats.js";

// Fire-and-forget event tracking — never blocks UI, silently drops on error
function trackEvent(userId,event,metadata={}){
  try{supabase.from('events').insert({user_id:userId,event,metadata}).then();}catch(e){}
}

// ============================================================
// DATA: All 2026 NFL Draft Prospects (450+)
// ============================================================
const PROSPECTS_RAW = [
  {name:"Fernando Mendoza",school:"Indiana",pos:"QB"},{name:"Ty Simpson",school:"Alabama",pos:"QB"},{name:"Garrett Nussmeier",school:"LSU",pos:"QB"},{name:"Drew Allar",school:"Penn State",pos:"QB"},{name:"Carson Beck",school:"Miami",pos:"QB"},{name:"Cole Payton",school:"North Dakota State",pos:"QB"},{name:"Sawyer Robertson",school:"Baylor",pos:"QB"},{name:"Taylen Green",school:"Arkansas",pos:"QB"},{name:"Jalon Daniels",school:"Kansas",pos:"QB"},{name:"Cade Klubnik",school:"Clemson",pos:"QB"},{name:"Luke Altmyer",school:"Illinois",pos:"QB"},{name:"Miller Moss",school:"Louisville",pos:"QB"},{name:"Behren Morton",school:"Texas Tech",pos:"QB"},{name:"Joe Fagnano",school:"UConn",pos:"QB"},{name:"Athan Kaliakmanis",school:"Rutgers",pos:"QB"},{name:"Diego Pavia",school:"Vanderbilt",pos:"QB"},{name:"Mark Gronowski",school:"Iowa",pos:"QB"},{name:"Haynes King",school:"Georgia Tech",pos:"QB"},{name:"Joey Aguilar",school:"Tennessee",pos:"QB"},
  {name:"Jeremiyah Love",school:"Notre Dame",pos:"RB"},{name:"Jadarian Price",school:"Notre Dame",pos:"RB"},{name:"Jonah Coleman",school:"Washington",pos:"RB"},{name:"Emmett Johnson",school:"Nebraska",pos:"RB"},{name:"Mike Washington Jr.",school:"Arkansas",pos:"RB"},{name:"Kaytron Allen",school:"Penn State",pos:"RB"},{name:"Nicholas Singleton",school:"Penn State",pos:"RB"},{name:"Kaelon Black",school:"Indiana",pos:"RB"},{name:"Roman Hemby",school:"Indiana",pos:"RB"},{name:"Demond Claiborne",school:"Wake Forest",pos:"RB"},{name:"J'Mari Taylor",school:"Virginia",pos:"RB"},{name:"Adam Randall",school:"Clemson",pos:"RB"},{name:"Robert Henry Jr.",school:"UTSA",pos:"RB"},{name:"Seth McGowan",school:"Kentucky",pos:"RB"},{name:"Eli Heidenreich",school:"Navy",pos:"RB"},{name:"Le'Veon Moss",school:"Texas A&M",pos:"RB"},{name:"Noah Whittington",school:"Oregon",pos:"RB"},{name:"Jam Miller",school:"Alabama",pos:"RB"},{name:"Jaydn Ott",school:"Oklahoma",pos:"RB"},{name:"Chip Trayanum",school:"Toledo",pos:"RB"},{name:"Kejon Owens",school:"Florida International",pos:"RB"},{name:"Kentrel Bullock",school:"South Alabama",pos:"RB"},{name:"Jamal Haynes",school:"Georgia Tech",pos:"RB"},{name:"Curtis Allen",school:"Virginia Union",pos:"RB"},{name:"CJ Donaldson",school:"Ohio State",pos:"RB"},{name:"Desmond Reid",school:"Pittsburgh",pos:"RB"},{name:"Max Bredeson",school:"Michigan",pos:"RB"},{name:"Dean Connors",school:"Houston",pos:"RB"},{name:"Rahsul Faison",school:"South Carolina",pos:"RB"},
  {name:"Carnell Tate",school:"Ohio State",pos:"WR"},{name:"Jordyn Tyson",school:"Arizona State",pos:"WR"},{name:"Makai Lemon",school:"USC",pos:"WR"},{name:"Denzel Boston",school:"Washington",pos:"WR"},{name:"KC Concepcion",school:"Texas A&M",pos:"WR"},{name:"Omar Cooper Jr.",school:"Indiana",pos:"WR"},{name:"Zachariah Branch",school:"Georgia",pos:"WR"},{name:"Chris Bell",school:"Louisville",pos:"WR"},{name:"Chris Brazzell II",school:"Tennessee",pos:"WR"},{name:"Malachi Fields",school:"Notre Dame",pos:"WR"},{name:"Elijah Sarratt",school:"Indiana",pos:"WR"},{name:"Germie Bernard",school:"Alabama",pos:"WR"},{name:"Antonio Williams",school:"Clemson",pos:"WR"},{name:"Ted Hurst",school:"Georgia State",pos:"WR"},{name:"Ja'Kobi Lane",school:"USC",pos:"WR"},{name:"Skyler Bell",school:"UConn",pos:"WR"},{name:"Deion Burks",school:"Oklahoma",pos:"WR"},{name:"Kevin Coleman Jr.",school:"Missouri",pos:"WR"},{name:"Josh Cameron",school:"Baylor",pos:"WR"},{name:"Brenen Thompson",school:"Mississippi State",pos:"WR"},{name:"Bryce Lance",school:"North Dakota State",pos:"WR"},{name:"CJ Daniels",school:"Miami",pos:"WR"},{name:"Reggie Virgil",school:"Texas Tech",pos:"WR"},{name:"Kaden Wetjen",school:"Iowa",pos:"WR"},{name:"Eric McAlister",school:"TCU",pos:"WR"},{name:"De'Zhaun Stribling",school:"Mississippi",pos:"WR"},{name:"Barion Brown",school:"LSU",pos:"WR"},{name:"Lewis Bond",school:"Boston College",pos:"WR"},{name:"Chase Roberts",school:"BYU",pos:"WR"},{name:"Caleb Douglas",school:"Texas Tech",pos:"WR"},{name:"Aaron Anderson",school:"LSU",pos:"WR"},{name:"Jordan Hudson",school:"SMU",pos:"WR"},{name:"Dane Key",school:"Nebraska",pos:"WR"},{name:"Tyren Montgomery",school:"John Carroll",pos:"WR"},{name:"Emmanuel Henderson Jr.",school:"Kansas",pos:"WR"},{name:"Cyrus Allen",school:"Cincinnati",pos:"WR"},{name:"Eric Rivers",school:"Georgia Tech",pos:"WR"},{name:"Zavion Thomas",school:"LSU",pos:"WR"},{name:"Caullin Lacy",school:"Louisville",pos:"WR"},{name:"Devin Voisin",school:"South Alabama",pos:"WR"},{name:"Colbie Young",school:"Georgia",pos:"WR"},{name:"Jeff Caldwell",school:"Cincinnati",pos:"WR"},{name:"Malik Benson",school:"Oregon",pos:"WR"},{name:"Michael Wortham",school:"Montana",pos:"WR"},{name:"Vinny Anthony II",school:"Wisconsin",pos:"WR"},{name:"Chris Hilton Jr.",school:"LSU",pos:"WR"},{name:"Hank Beatty",school:"Illinois",pos:"WR"},{name:"Kendrick Law",school:"Kentucky",pos:"WR"},{name:"Keelan Marion",school:"Miami (FL)",pos:"WR"},{name:"J. Michael Sturdivant",school:"Florida",pos:"WR"},{name:"Noah Thomas",school:"Georgia",pos:"WR"},{name:"Dillon Bell",school:"Georgia",pos:"WR"},{name:"Romello Brinson",school:"SMU",pos:"WR"},{name:"Squirrel White",school:"Florida State",pos:"WR"},{name:"Harrison Wallace III",school:"Mississippi",pos:"WR"},{name:"Griffin Wilde",school:"Northwestern",pos:"WR"},{name:"Jalil Farooq",school:"Maryland",pos:"WR"},{name:"Donaven McCulley",school:"Michigan",pos:"WR"},{name:"Jalen Walthall",school:"Incarnate Word",pos:"WR"},
  {name:"Kenyon Sadiq",school:"Oregon",pos:"TE"},{name:"Eli Stowers",school:"Vanderbilt",pos:"TE"},{name:"Max Klare",school:"Ohio State",pos:"TE"},{name:"Michael Trigg",school:"Baylor",pos:"TE"},{name:"Justin Joly",school:"N.C. State",pos:"TE"},{name:"Oscar Delp",school:"Georgia",pos:"TE"},{name:"Jack Endries",school:"Texas",pos:"TE"},{name:"Joe Royer",school:"Cincinnati",pos:"TE"},{name:"Tanner Koziol",school:"Houston",pos:"TE"},{name:"Dallen Bentley",school:"Utah",pos:"TE"},{name:"Sam Roush",school:"Stanford",pos:"TE"},{name:"Nate Boerkircher",school:"Texas A&M",pos:"TE"},{name:"Eli Raridon",school:"Notre Dame",pos:"TE"},{name:"Dae'Quan Wright",school:"Mississippi",pos:"TE"},{name:"John Michael Gyllenborg",school:"Wyoming",pos:"TE"},{name:"Riley Nowakowski",school:"Indiana",pos:"TE"},{name:"Josh Cuevas",school:"Alabama",pos:"TE"},{name:"Marlin Klein",school:"Michigan",pos:"TE"},{name:"Dan Villari",school:"Syracuse",pos:"TE"},{name:"Will Kacmarek",school:"Ohio State",pos:"TE"},{name:"RJ Maryland",school:"SMU",pos:"TE"},{name:"Carsen Ryan",school:"BYU",pos:"TE"},{name:"Seydou Traore",school:"Mississippi State",pos:"TE"},{name:"Miles Kitselman",school:"Tennessee",pos:"TE"},{name:"Bauer Sharp",school:"LSU",pos:"TE"},{name:"Khalil Dinkins",school:"Penn State",pos:"TE"},{name:"Lake McRee",school:"USC",pos:"TE"},{name:"Tanner Arkin",school:"Illinois",pos:"TE"},{name:"Lance Mason",school:"Wisconsin",pos:"TE"},{name:"Jaren Kanak",school:"Oklahoma",pos:"TE"},{name:"Matthew Hibner",school:"SMU",pos:"TE"},{name:"DJ Rogers",school:"TCU",pos:"TE"},{name:"Jameson Geers",school:"Minnesota",pos:"TE"},
  {name:"Francis Mauigoa",school:"Miami",pos:"OL"},{name:"Spencer Fano",school:"Utah",pos:"OL"},{name:"Olaivavega Ioane",school:"Penn State",pos:"OL"},{name:"Kadyn Proctor",school:"Alabama",pos:"OL"},{name:"Caleb Lomu",school:"Utah",pos:"OL"},{name:"Monroe Freeling",school:"Georgia",pos:"OL"},{name:"Blake Miller",school:"Clemson",pos:"OL"},{name:"Emmanuel Pregnon",school:"Oregon",pos:"OL"},{name:"Max Iheanachor",school:"Arizona State",pos:"OL"},{name:"Chase Bisontis",school:"Texas A&M",pos:"OL"},{name:"Gennings Dunker",school:"Iowa",pos:"OL"},{name:"Caleb Tiernan",school:"Northwestern",pos:"OL"},{name:"Connor Lew",school:"Auburn",pos:"OL"},{name:"Sam Hecht",school:"Kansas State",pos:"OL"},{name:"Isaiah World",school:"Oregon",pos:"OL"},{name:"Brian Parker II",school:"Duke",pos:"OL"},{name:"Keylan Rutledge",school:"Georgia Tech",pos:"OL"},{name:"Jake Slaughter",school:"Florida",pos:"OL"},{name:"Logan Jones",school:"Iowa",pos:"OL"},{name:"Beau Stephens",school:"Iowa",pos:"OL"},{name:"Parker Brailsford",school:"Alabama",pos:"OL"},{name:"Austin Barber",school:"Florida",pos:"OL"},{name:"Kage Casey",school:"Boise State",pos:"OL"},{name:"Dametrious Crownover",school:"Texas A&M",pos:"OL"},{name:"J.C. Davis",school:"Illinois",pos:"OL"},{name:"Jude Bowry",school:"Boston College",pos:"OL"},{name:"Pat Coogan",school:"Indiana",pos:"OL"},{name:"Drew Shelton",school:"Penn State",pos:"OL"},{name:"Jalen Farmer",school:"Kentucky",pos:"OL"},{name:"Trey Zuhn III",school:"Texas A&M",pos:"OL"},{name:"Jeremiah Wright",school:"Auburn",pos:"OL"},{name:"Fernando Carmona",school:"Arkansas",pos:"OL"},{name:"Ar'maj Reed-Adams",school:"Texas A&M",pos:"OL"},{name:"DJ Campbell",school:"Texas",pos:"OL"},{name:"Fa'alili Fa'amoe",school:"Wake Forest",pos:"OL"},{name:"Matt Gulbin",school:"Michigan State",pos:"OL"},{name:"Jager Burton",school:"Kentucky",pos:"OL"},{name:"Keagen Trost",school:"Missouri",pos:"OL"},{name:"Aamil Wagner",school:"Notre Dame",pos:"OL"},{name:"Markel Bell",school:"Miami",pos:"OL"},{name:"Febechi Nwaiwu",school:"Oklahoma",pos:"OL"},{name:"Jaeden Roberts",school:"Alabama",pos:"OL"},{name:"Billy Schrauth",school:"Notre Dame",pos:"OL"},{name:"Anez Cooper",school:"Miami",pos:"OL"},{name:"James Brockermeyer",school:"Miami (FL)",pos:"OL"},{name:"Riley Mahlman",school:"Wisconsin",pos:"OL"},{name:"Carver Willis",school:"Washington",pos:"OL"},{name:"Connor Tollison",school:"Missouri",pos:"OL"},{name:"Alex Harkey",school:"Oregon",pos:"OL"},{name:"Micah Morris",school:"Georgia",pos:"OL"},{name:"Logan Taylor",school:"Boston College",pos:"OL"},{name:"Tristan Leigh",school:"Clemson",pos:"OL"},{name:"Caden Barnett",school:"Wyoming",pos:"OL"},{name:"Delby Lemieux",school:"Dartmouth",pos:"OL"},{name:"Andrew Gentry",school:"BYU",pos:"OL"},{name:"James Neal",school:"Iowa State",pos:"OL"},{name:"Giovanni El-Hadi",school:"Michigan",pos:"OL"},{name:"Travis Burke",school:"Memphis",pos:"OL"},{name:"Dillon Wade",school:"Auburn",pos:"OL"},{name:"Joe Cooper",school:"Slippery Rock",pos:"OL"},{name:"Evan Beerntsen",school:"Northwestern",pos:"OL"},{name:"Jayden Williams",school:"Mississippi",pos:"OL"},{name:"Kobe Baynes",school:"Kansas",pos:"OL"},{name:"Garrett DiGiorgio",school:"UCLA",pos:"OL"},{name:"Nolan Rucci",school:"Penn State",pos:"OL"},{name:"Elijah Pritchett",school:"Nebraska",pos:"OL"},{name:"Ethan Onianwa",school:"Ohio State",pos:"OL"},{name:"Ka'ena Decambra",school:"Arizona",pos:"OL"},{name:"Reuben Unije",school:"UCLA",pos:"OL"},{name:"Alan Herron",school:"Maryland",pos:"OL"},{name:"Joshua Braun",school:"Kentucky",pos:"OL"},{name:"Tomas Rimac",school:"Virginia Tech",pos:"OL"},{name:"Izavion Miller",school:"Auburn",pos:"OL"},{name:"P.J. Williams",school:"SMU",pos:"OL"},{name:"Sheridan Wilson",school:"Texas Tech",pos:"OL"},{name:"Trevor Lauck",school:"Iowa",pos:"OL"},{name:"Dorion Strawn",school:"Texas State",pos:"OL"},{name:"Josh Thompson",school:"LSU",pos:"OL"},{name:"Derek Simmons",school:"Oklahoma",pos:"OL"},{name:"Diego Pounds",school:"Mississippi",pos:"OL"},{name:"Braelin Moore",school:"LSU",pos:"OL"},{name:"Bryce Foster",school:"Kansas",pos:"OL"},{name:"Wendell Moe Jr.",school:"Tennessee",pos:"OL"},{name:"Noah Josey",school:"Virginia",pos:"OL"},{name:"Micah Pettus",school:"Florida State",pos:"OL"},{name:"Rocco Spindler",school:"Nebraska",pos:"OL"},{name:"Ben Taylor-Whitfield",school:"TCU",pos:"OL"},{name:"Isaiah Jatta",school:"BYU",pos:"OL"},{name:"Chris Adams",school:"Memphis",pos:"OL"},{name:"Charles Jagusah",school:"Notre Dame",pos:"OL"},{name:"Enrique Cruz Jr.",school:"Kansas",pos:"OL"},
  {name:"Rueben Bain Jr.",school:"Miami",pos:"DL"},{name:"David Bailey",school:"Texas Tech",pos:"DL"},{name:"Keldric Faulk",school:"Auburn",pos:"DL"},{name:"Peter Woods",school:"Clemson",pos:"DL"},{name:"Cashius Howell",school:"Texas A&M",pos:"DL"},{name:"Caleb Banks",school:"Florida",pos:"DL"},{name:"Akheem Mesidor",school:"Miami",pos:"DL"},{name:"T.J. Parker",school:"Clemson",pos:"DL"},{name:"Kayden McDonald",school:"Ohio State",pos:"DL"},{name:"Lee Hunter",school:"Texas Tech",pos:"DL"},{name:"Zion Young",school:"Missouri",pos:"DL"},{name:"R Mason Thomas",school:"Oklahoma",pos:"DL"},{name:"Christen Miller",school:"Georgia",pos:"DL"},{name:"LT Overton",school:"Alabama",pos:"DL"},{name:"Derrick Moore",school:"Michigan",pos:"DL"},{name:"Joshua Josephs",school:"Tennessee",pos:"DL"},{name:"Gabe Jacas",school:"Illinois",pos:"DL"},{name:"Darrell Jackson Jr.",school:"Florida State",pos:"DL"},{name:"Romello Height",school:"Texas Tech",pos:"DL"},{name:"Domonique Orange",school:"Iowa State",pos:"DL"},{name:"Dani Dennis-Sutton",school:"Penn State",pos:"DL"},{name:"Malachi Lawrence",school:"UCF",pos:"DL"},{name:"Dontay Corleone",school:"Cincinnati",pos:"DL"},{name:"Gracen Halton",school:"Oklahoma",pos:"DL"},{name:"Anthony Lucas",school:"USC",pos:"DL"},{name:"Keyron Crawford",school:"Auburn",pos:"DL"},{name:"Chris McClellan",school:"Missouri",pos:"DL"},{name:"Rayshaun Benny",school:"Michigan",pos:"DL"},{name:"Tim Keenan III",school:"Alabama",pos:"DL"},{name:"Jaishawn Barham",school:"Michigan",pos:"DL"},{name:"Mikail Kamara",school:"Indiana",pos:"DL"},{name:"Skyler Gill-Howard",school:"Texas Tech",pos:"DL"},{name:"Zane Durant",school:"Penn State",pos:"DL"},{name:"DeMonte Capehart",school:"Clemson",pos:"DL"},{name:"Caden Curry",school:"Ohio State",pos:"DL"},{name:"Tyreak Sapp",school:"Florida",pos:"DL"},{name:"Nadame Tucker",school:"Western Michigan",pos:"DL"},{name:"Vincent Anthony Jr.",school:"Duke",pos:"DL"},{name:"Max Llewellyn",school:"Iowa",pos:"DL"},{name:"Albert Regis",school:"Texas A&M",pos:"DL"},{name:"Zxavian Harris",school:"Mississippi",pos:"DL"},{name:"Kaleb Proctor",school:"Southeastern Louisiana",pos:"DL"},{name:"Nick Barrett",school:"South Carolina",pos:"DL"},{name:"David Gusta",school:"Kentucky",pos:"DL"},{name:"Deven Eastern",school:"Minnesota",pos:"DL"},{name:"Landon Robinson",school:"Navy",pos:"DL"},{name:"Quintayvious Hutchins",school:"Boston College",pos:"DL"},{name:"Logan Fano",school:"Utah",pos:"DL"},{name:"Trey Moore",school:"Texas",pos:"DL"},{name:"Cameron Ball",school:"Arkansas",pos:"DL"},{name:"Jeffrey M'ba",school:"SMU",pos:"DL"},{name:"Nyjalik Kelly",school:"UCF",pos:"DL"},{name:"Bryson Eason",school:"Tennessee",pos:"DL"},{name:"Keyshawn James-Newby",school:"New Mexico",pos:"DL"},{name:"Tyler Onyedim",school:"Texas A&M",pos:"DL"},{name:"TJ Guy",school:"Michigan",pos:"DL"},{name:"James Thompson Jr.",school:"Illinois",pos:"DL"},{name:"Cole Brevard",school:"Texas",pos:"DL"},{name:"Aaron Hall",school:"Duke",pos:"DL"},{name:"Patrick Payton",school:"LSU",pos:"DL"},{name:"Michael Heldman",school:"Central Michigan",pos:"DL"},{name:"Aidan Hubbard",school:"Northwestern",pos:"DL"},{name:"Jackson Kuwatch",school:"Miami (OH)",pos:"DL"},{name:"David Blay",school:"Miami (FL)",pos:"DL"},{name:"Gary Smith III",school:"UCLA",pos:"DL"},{name:"Eric O'Neill",school:"Rutgers",pos:"DL"},{name:"Wesley Williams",school:"Duke",pos:"DL"},{name:"Keeshawn Silver",school:"USC",pos:"DL"},{name:"Mason Reiger",school:"Wisconsin",pos:"DL"},{name:"Damonic Williams",school:"Oklahoma",pos:"DL"},{name:"Jack Pyburn",school:"LSU",pos:"DL"},{name:"Terry Webb",school:"SMU",pos:"DL"},{name:"Aaron Graves",school:"Iowa",pos:"DL"},{name:"George Gumbs Jr.",school:"Florida",pos:"DL"},{name:"Bryan Thomas Jr.",school:"South Carolina",pos:"DL"},{name:"Kalil Alexander",school:"Texas State",pos:"DL"},{name:"Jackie Marshall",school:"Baylor",pos:"DL"},{name:"Jahiem Lawson",school:"Clemson",pos:"DL"},{name:"Ethan Burke",school:"Texas",pos:"DL"},{name:"Tyre West",school:"Tennessee",pos:"DL"},{name:"Cian Slone",school:"NC State",pos:"DL"},{name:"D.J. Hicks",school:"Texas A&M",pos:"DL"},{name:"Rene Konga",school:"Louisville",pos:"DL"},{name:"Michael Kilbane",school:"Northwestern",pos:"DL"},{name:"Dominic Bailey",school:"Tennessee",pos:"DL"},{name:"Dayon Hayes",school:"Texas A&M",pos:"DL"},{name:"Devean Deal",school:"TCU",pos:"DL"},{name:"Marvin Jones Jr.",school:"Oklahoma",pos:"DL"},{name:"Jayden Virgin-Morgan",school:"Boise State",pos:"DL"},{name:"Jordan van den Berg",school:"Georgia Tech",pos:"DL"},{name:"Hero Kanu",school:"Texas",pos:"DL"},{name:"Clay Patterson",school:"Stanford",pos:"DL"},{name:"Brandon Cleveland",school:"N.C. State",pos:"DL"},{name:"Bobby Jamison-Travis",school:"Auburn",pos:"DL"},
  {name:"Arvell Reese",school:"Ohio State",pos:"LB"},{name:"Sonny Styles",school:"Ohio State",pos:"LB"},{name:"CJ Allen",school:"Georgia",pos:"LB"},{name:"Anthony Hill Jr.",school:"Texas",pos:"LB"},{name:"Jake Golday",school:"Cincinnati",pos:"LB"},{name:"Jacob Rodriguez",school:"Texas Tech",pos:"LB"},{name:"Josiah Trotter",school:"Missouri",pos:"LB"},{name:"Kyle Louis",school:"Pittsburgh",pos:"LB"},{name:"Deontae Lawson",school:"Alabama",pos:"LB"},{name:"Harold Perkins Jr.",school:"LSU",pos:"LB"},{name:"Taurean York",school:"Texas A&M",pos:"LB"},{name:"Lander Barton",school:"Utah",pos:"LB"},{name:"Bryce Boettcher",school:"Oregon",pos:"LB"},{name:"Aiden Fisher",school:"Indiana",pos:"LB"},{name:"Kendal Daniels",school:"Oklahoma",pos:"LB"},{name:"Keyshaun Elliott",school:"Arizona State",pos:"LB"},{name:"Eric Gentry",school:"USC",pos:"LB"},{name:"Xavian Sorey Jr.",school:"Arkansas",pos:"LB"},{name:"Kaleb Elarms-Orr",school:"TCU",pos:"LB"},{name:"Jack Kelly",school:"BYU",pos:"LB"},{name:"Justin Jefferson",school:"Alabama",pos:"LB"},{name:"Jimmy Rolder",school:"Michigan",pos:"LB"},{name:"Namdi Obiazor",school:"TCU",pos:"LB"},{name:"Scooby Williams",school:"Texas A&M",pos:"LB"},{name:"Red Murdock",school:"Buffalo",pos:"LB"},{name:"Wesley Bissainthe",school:"Miami",pos:"LB"},{name:"Caden Fordham",school:"NC State",pos:"LB"},{name:"West Weeks",school:"LSU",pos:"LB"},{name:"Karson Sharar",school:"Iowa",pos:"LB"},{name:"Declan Williams",school:"Incarnate Word",pos:"LB"},{name:"Jaden Dugger",school:"Louisiana-Lafayette",pos:"LB"},{name:"Owen Heinecke",school:"Oklahoma",pos:"LB"},{name:"Ernest Hausmann",school:"Michigan",pos:"LB"},{name:"Isaiah Glasker",school:"BYU",pos:"LB"},{name:"Kam Robinson",school:"Virginia",pos:"LB"},{name:"Dariel Djabome",school:"Rutgers",pos:"LB"},{name:"Wade Woodaz",school:"Clemson",pos:"LB"},
  {name:"Caleb Downs",school:"Ohio State",pos:"DB"},{name:"Mansoor Delane",school:"LSU",pos:"DB"},{name:"Jermod McCoy",school:"Tennessee",pos:"DB"},{name:"Avieon Terrell",school:"Clemson",pos:"DB"},{name:"Brandon Cisse",school:"South Carolina",pos:"DB"},{name:"Colton Hood",school:"Tennessee",pos:"DB"},{name:"Emmanuel McNeil-Warren",school:"Toledo",pos:"DB"},{name:"Dillon Thieneman",school:"Oregon",pos:"DB"},{name:"Keith Abney II",school:"Arizona State",pos:"DB"},{name:"Chris Johnson",school:"San Diego State",pos:"DB"},{name:"Keionte Scott",school:"Miami",pos:"DB"},{name:"D'Angelo Ponds",school:"Indiana",pos:"DB"},{name:"A.J. Haulcy",school:"LSU",pos:"DB"},{name:"Kamari Ramsey",school:"USC",pos:"DB"},{name:"Davison Igbinosun",school:"Ohio State",pos:"DB"},{name:"Zakee Wheatley",school:"Penn State",pos:"DB"},{name:"Malik Muhammad",school:"Texas",pos:"DB"},{name:"Devin Moore",school:"Florida",pos:"DB"},{name:"Genesis Smith",school:"Arizona",pos:"DB"},{name:"Chandler Rivers",school:"Duke",pos:"DB"},{name:"Julian Neal",school:"Arkansas",pos:"DB"},{name:"Treydan Stukes",school:"Arizona",pos:"DB"},{name:"Jalon Kilgore",school:"South Carolina",pos:"DB"},{name:"Bud Clark",school:"TCU",pos:"DB"},{name:"Will Lee III",school:"Texas A&M",pos:"DB"},{name:"Daylen Everette",school:"Georgia",pos:"DB"},{name:"Michael Taaffe",school:"Texas",pos:"DB"},{name:"Tacario Davis",school:"Washington",pos:"DB"},{name:"Louis Moore",school:"Indiana",pos:"DB"},{name:"Hezekiah Masses",school:"Cal",pos:"DB"},{name:"Bishop Fitzgerald",school:"USC",pos:"DB"},{name:"Ephesians Prysock",school:"Washington",pos:"DB"},{name:"TJ Hall",school:"Iowa",pos:"DB"},{name:"VJ Payne",school:"Kansas State",pos:"DB"},{name:"Cole Wisniewski",school:"Texas Tech",pos:"DB"},{name:"Domani Jackson",school:"Alabama",pos:"DB"},{name:"Jadon Canady",school:"Oregon",pos:"DB"},{name:"Devon Marshall",school:"NC State",pos:"DB"},{name:"Thaddeus Dixon",school:"North Carolina",pos:"DB"},{name:"Jakobe Thomas",school:"Miami",pos:"DB"},{name:"Jalen Huskey",school:"Maryland",pos:"DB"},{name:"Charles Demmings",school:"Stephen F. Austin",pos:"DB"},{name:"Jalen McMurray",school:"Tennessee",pos:"DB"},{name:"Andre Fuller",school:"Toledo",pos:"DB"},{name:"Xavier Nwankpa",school:"Iowa",pos:"DB"},{name:"Robert Spears-Jennings",school:"Oklahoma",pos:"DB"},{name:"Jalen Stroman",school:"Notre Dame",pos:"DB"},{name:"Devan Boykin",school:"Indiana",pos:"DB"},{name:"Jalen Catalon",school:"Missouri",pos:"DB"},{name:"Jeadyn Lukus",school:"Clemson",pos:"DB"},{name:"Fred Davis II",school:"Northwestern",pos:"DB"},{name:"Ceyair Wright",school:"Nebraska",pos:"DB"},{name:"Jakari Foster",school:"Louisiana Tech",pos:"DB"},{name:"DeShon Singleton",school:"Nebraska",pos:"DB"},{name:"DJ Harvey",school:"USC",pos:"DB"},{name:"Jaylon Guilbeau",school:"Texas",pos:"DB"},{name:"D.Q. Smith",school:"South Carolina",pos:"DB"},{name:"Marcus Allen",school:"North Carolina",pos:"DB"},{name:"Austin Brown",school:"Wisconsin",pos:"DB"},{name:"Ahmari Harvey",school:"Georgia Tech",pos:"DB"},{name:"Kolbey Taylor",school:"Vanderbilt",pos:"DB"},{name:"Jarod Washington",school:"South Carolina State",pos:"DB"},{name:"Myles Rowser",school:"Arizona State",pos:"DB"},{name:"Dalton Johnson",school:"Arizona",pos:"DB"},{name:"Josh Moten",school:"Southern Miss",pos:"DB"},{name:"Dontae Balfour",school:"Texas Tech",pos:"DB"},{name:"Skyler Thomas",school:"Oregon State",pos:"DB"},{name:"Blake Cotton",school:"Utah",pos:"DB"},{name:"Isaiah Nwokobia",school:"SMU",pos:"DB"},{name:"Jacob Thomas",school:"James Madison",pos:"DB"},{name:"Jerry Wilson",school:"Florida State",pos:"DB"},{name:"Ricardo Hallman",school:"Wisconsin",pos:"DB"},{name:"Collin Wright",school:"Stanford",pos:"DB"},{name:"Wydett Williams Jr.",school:"Mississippi",pos:"DB"},{name:"Brent Austin",school:"California",pos:"DB"},{name:"Avery Smith",school:"Toledo",pos:"DB"},{name:"Dalton Brooks",school:"Texas A&M",pos:"DB"},{name:"Miles Scott",school:"Illinois",pos:"DB"},{name:"Davaughn Patterson",school:"Wake Forest",pos:"DB"},{name:"Ahmaad Moses",school:"SMU",pos:"DB"},{name:"Toriano Pride Jr.",school:"Missouri",pos:"DB"},{name:"Latrell McCutchin Sr.",school:"Houston",pos:"DB"},{name:"Lorenzo Styles Jr.",school:"Ohio State",pos:"DB"},
  {name:"Ryan Eckley",school:"Michigan State",pos:"K/P"},{name:"Drew Stevens",school:"Iowa",pos:"K/P"},{name:"Luke Basso",school:"Oregon",pos:"K/P"},{name:"Beau Gardner",school:"Georgia",pos:"K/P"},{name:"Will Ferrin",school:"BYU",pos:"K/P"},{name:"Trey Smack",school:"Florida",pos:"K/P"},{name:"Tommy Doman Jr.",school:"Florida",pos:"K/P"},{name:"Garrison Grimes",school:"BYU",pos:"K/P"},{name:"Tyler Duzansky",school:"Penn State",pos:"K/P"},{name:"Jack Stonehouse",school:"Syracuse",pos:"K/P"},{name:"Dominic Zvada",school:"Michigan",pos:"K/P"},{name:"Palmer Williams",school:"Baylor",pos:"K/P"},{name:"Brett Thorson",school:"Georgia",pos:"K/P"},
];
const PROSPECTS = PROSPECTS_RAW.map((p,i)=>({...p,id:`p${i}`,gpos:(getProspectStats(p.name,p.school)?.gpos)||p.pos}));
const SCHOOL_ESPN_ID={"Alabama":333,"Arizona State":9,"Arizona":12,"Arkansas":8,"Auburn":2,"BYU":252,"Baylor":239,"Boise State":68,"Boston College":103,"Buffalo":2084,"Cal":25,"California":25,"Central Michigan":2117,"Cincinnati":2132,"Clemson":228,"Dartmouth":159,"Duke":150,"Florida International":2229,"Florida State":52,"Florida":57,"Georgia State":2247,"Georgia Tech":59,"Georgia":61,"Houston":248,"Illinois":356,"Incarnate Word":2916,"Indiana":84,"Iowa State":66,"Iowa":2294,"James Madison":256,"Kansas State":2306,"Kansas":2305,"Kentucky":96,"LSU":99,"Louisiana Tech":2348,"Louisiana-Lafayette":309,"Louisville":97,"Maryland":120,"Memphis":235,"Miami":2390,"Miami (FL)":2390,"Miami (OH)":193,"Michigan State":127,"Michigan":130,"Minnesota":135,"Mississippi State":344,"Mississippi":145,"Missouri":142,"Montana":149,"N.C. State":152,"NC State":152,"Navy":2426,"Nebraska":158,"New Mexico":167,"North Carolina":153,"North Dakota State":2449,"Northwestern":77,"Notre Dame":87,"Ohio State":194,"Oklahoma":201,"Oregon":2483,"Oregon State":204,"Penn State":213,"Pittsburgh":221,"Rutgers":164,"SMU":2567,"San Diego State":21,"Slippery Rock":2596,"South Alabama":6,"South Carolina":2579,"South Carolina State":2569,"Southeastern Louisiana":2545,"Southern Miss":2572,"Stanford":24,"Stephen F. Austin":2617,"Syracuse":183,"TCU":2628,"Tennessee":2633,"Texas A&M":245,"Texas State":326,"Texas Tech":2641,"Texas":251,"Toledo":2649,"UCF":2116,"UCLA":26,"UConn":41,"USC":30,"UTSA":2636,"Utah":254,"Vanderbilt":238,"Virginia":258,"Virginia Tech":259,"Virginia Union":2762,"Wake Forest":154,"Washington":264,"Western Michigan":2711,"Wisconsin":275,"Wyoming":2751};
function schoolLogo(s){const id=SCHOOL_ESPN_ID[s];return id?`https://a.espncdn.com/i/teamlogos/ncaa/500/${id}.png`:null;}
const POSITION_TRAITS={QB:["Arm Strength","Accuracy","Pocket Presence","Mobility","Decision Making","Leadership"],RB:["Vision","Burst","Power","Elusiveness","Pass Catching","Pass Protection"],WR:["Route Running","Separation","Hands","YAC Ability","Speed","Contested Catches"],TE:["Receiving","Route Running","Blocking","Athleticism","Hands","Versatility"],OT:["Pass Protection","Run Blocking","Footwork","Anchor","Athleticism","Versatility"],IOL:["Pass Protection","Run Blocking","Pulling","Strength","Awareness","Versatility"],EDGE:["Pass Rush","Bend","First Step","Hand Usage","Motor","Run Defense"],DL:["Pass Rush","Run Defense","First Step","Hand Usage","Motor","Versatility"],LB:["Tackling","Coverage","Blitz Ability","Instincts","Athleticism","Range"],CB:["Coverage","Ball Skills","Tackling","Speed","Press","Football IQ"],S:["Coverage","Range","Ball Skills","Tackling","Versatility","Football IQ"],"K/P":["Leg Strength","Accuracy","Consistency","Clutch","Directional Control","Hang Time"]};
const TRAIT_EMOJI={"Arm Strength":"💪","Accuracy":"🎯","Pocket Presence":"🧊","Mobility":"🏃","Decision Making":"🧠","Leadership":"👑","Vision":"👁️","Burst":"⚡","Power":"🦬","Elusiveness":"💨","Pass Catching":"🧤","Pass Protection":"🛡️","Route Running":"✂️","Separation":"🌀","Hands":"🤲","YAC Ability":"🔥","Speed":"🏎️","Contested Catches":"🏀","Receiving":"📡","Blocking":"🧱","Athleticism":"🦅","Versatility":"🔄","Run Blocking":"⛏️","Footwork":"👟","Anchor":"⚓","Pulling":"🚂","Strength":"🏋️","Awareness":"📡","Pass Rush":"🌪️","Bend":"🐍","First Step":"⚡","Hand Usage":"🤚","Motor":"🔋","Run Defense":"🧱","Tackling":"💥","Coverage":"🪂","Blitz Ability":"🚀","Instincts":"🧠","Range":"📡","Ball Skills":"🧲","Press":"✋","Football IQ":"📋","Leg Strength":"🦵","Consistency":"📏","Clutch":"❄️","Directional Control":"🧭","Hang Time":"⏱️"};
const TRAIT_WEIGHTS={QB:{"Accuracy":.25,"Decision Making":.22,"Pocket Presence":.18,"Arm Strength":.15,"Leadership":.12,"Mobility":.08},RB:{"Vision":.22,"Elusiveness":.20,"Burst":.18,"Power":.15,"Pass Catching":.13,"Pass Protection":.12},WR:{"Route Running":.22,"Separation":.20,"Hands":.18,"Speed":.16,"YAC Ability":.13,"Contested Catches":.11},TE:{"Receiving":.20,"Blocking":.20,"Route Running":.18,"Hands":.16,"Athleticism":.14,"Versatility":.12},OT:{"Pass Protection":.25,"Footwork":.20,"Anchor":.18,"Run Blocking":.15,"Athleticism":.12,"Versatility":.10},IOL:{"Run Blocking":.22,"Pass Protection":.22,"Strength":.18,"Pulling":.14,"Awareness":.13,"Versatility":.11},EDGE:{"Pass Rush":.24,"First Step":.20,"Bend":.18,"Hand Usage":.15,"Motor":.13,"Run Defense":.10},DL:{"Run Defense":.22,"Pass Rush":.20,"First Step":.18,"Hand Usage":.16,"Motor":.14,"Versatility":.10},LB:{"Instincts":.22,"Tackling":.20,"Coverage":.18,"Athleticism":.15,"Blitz Ability":.13,"Range":.12},CB:{"Coverage":.24,"Ball Skills":.20,"Speed":.18,"Press":.15,"Football IQ":.13,"Tackling":.10},S:{"Coverage":.22,"Range":.20,"Ball Skills":.18,"Tackling":.16,"Football IQ":.14,"Versatility":.10},"K/P":{"Accuracy":.25,"Leg Strength":.22,"Consistency":.20,"Clutch":.13,"Directional Control":.12,"Hang Time":.08}};
const TRAIT_TEACHABILITY={"Arm Strength":.1,"Accuracy":.7,"Pocket Presence":.6,"Mobility":.1,"Decision Making":.65,"Leadership":.5,"Vision":.4,"Burst":.1,"Power":.2,"Elusiveness":.15,"Pass Catching":.6,"Pass Protection":.7,"Route Running":.75,"Separation":.5,"Hands":.5,"YAC Ability":.3,"Speed":.05,"Contested Catches":.4,"Receiving":.6,"Blocking":.7,"Athleticism":.05,"Versatility":.3,"Run Blocking":.7,"Footwork":.65,"Anchor":.3,"Pulling":.6,"Strength":.2,"Awareness":.6,"Pass Rush":.4,"Bend":.15,"First Step":.1,"Hand Usage":.65,"Motor":.2,"Run Defense":.6,"Tackling":.6,"Coverage":.5,"Blitz Ability":.4,"Instincts":.35,"Range":.1,"Ball Skills":.3,"Press":.55,"Football IQ":.6,"Leg Strength":.1,"Consistency":.5,"Clutch":.3,"Directional Control":.6,"Hang Time":.2};
const POSITION_GROUPS=["QB","RB","WR","TE","OT","IOL","EDGE","DL","LB","CB","S","K/P"];
const POS_EMOJI={QB:"🎯",RB:"🏃",WR:"🧤",TE:"🦾",OT:"🛡️",IOL:"🧱",EDGE:"🌪️",DL:"🦬",LB:"💥",CB:"🏝️",S:"🦅","K/P":"🦵"};
const POS_COLORS={QB:"#1e3a5f",RB:"#5b21b6",WR:"#0d9488",TE:"#0891b2",OT:"#b45309",IOL:"#d97706",OL:"#b45309",EDGE:"#15803d",DL:"#166534",LB:"#4338ca",CB:"#0f766e",S:"#047857",DB:"#0f766e","K/P":"#78716c"};
const INITIAL_ELO=1500;
function expectedScore(rA,rB){return 1/(1+Math.pow(10,(rB-rA)/400));}
function eloUpdate(rA,rB,aWon,k=32){const eA=expectedScore(rA,rB);return{newA:rA+k*((aWon?1:0)-eA),newB:rB+k*((aWon?0:1)-(1-eA))};}
function generateMatchups(ids,consensusRankFn){
  // Front-load matchups involving top consensus prospects
  const sorted=[...ids].sort((a,b)=>(consensusRankFn?.(a)||999)-(consensusRankFn?.(b)||999));
  const topN=sorted.slice(0,Math.min(15,Math.ceil(ids.length*0.3))); // top 30% or 15, whichever smaller
  const rest=sorted.slice(topN.length);
  // Phase 1: all pairs among top players (most important comparisons)
  const phase1=[];
  for(let i=0;i<topN.length;i++)for(let j=i+1;j<topN.length;j++)phase1.push([topN[i],topN[j]]);
  // Phase 2: top players vs rest (establishes boundary)
  const phase2=[];
  for(let i=0;i<topN.length;i++)for(let j=0;j<rest.length;j++)phase2.push([topN[i],rest[j]]);
  // Phase 3: rest vs rest (least important)
  const phase3=[];
  for(let i=0;i<rest.length;i++)for(let j=i+1;j<rest.length;j++)phase3.push([rest[i],rest[j]]);
  // Shuffle within each phase
  const shuffle=a=>{for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
  return[...shuffle(phase1),...shuffle(phase2),...shuffle(phase3)];
}
function getNextMatchup(mups,done,ratings,compCounts,consensusRankFn,lockedId){
  let rem=mups.filter(m=>!done.has(`${m[0]}-${m[1]}`));
  if(lockedId)rem=rem.filter(m=>m[0]===lockedId||m[1]===lockedId);
  if(!rem.length)return null;
  // Score each remaining matchup: prefer matchups involving top consensus players with few comparisons
  rem.forEach(m=>{
    const crA=consensusRankFn?.(m[0])||999;const crB=consensusRankFn?.(m[1])||999;
    const ccA=compCounts?.[m[0]]||0;const ccB=compCounts?.[m[1]]||0;
    // Priority: top consensus players who haven't been compared much
    // Lower score = higher priority
    const consensusBonus=(Math.min(crA,crB)<=5?-200:Math.min(crA,crB)<=10?-100:Math.min(crA,crB)<=15?-50:0);
    const undersampledBonus=-(Math.max(0,3-ccA)*40+Math.max(0,3-ccB)*40); // bonus for players under 3 comps
    const eloCloseness=Math.abs((ratings[m[0]]||1500)-(ratings[m[1]]||1500));
    m._score=consensusBonus+undersampledBonus+eloCloseness;
  });
  rem.sort((a,b)=>a._score-b._score);
  // Pick from top 3 candidates with slight randomness
  return rem[Math.floor(Math.random()*Math.min(3,rem.length))];
}
const DRAFT_ORDER=[{pick:1,team:"Raiders"},{pick:2,team:"Jets"},{pick:3,team:"Cardinals"},{pick:4,team:"Titans"},{pick:5,team:"Giants"},{pick:6,team:"Browns"},{pick:7,team:"Commanders"},{pick:8,team:"Saints"},{pick:9,team:"Chiefs"},{pick:10,team:"Bengals"},{pick:11,team:"Dolphins"},{pick:12,team:"Cowboys"},{pick:13,team:"Rams"},{pick:14,team:"Ravens"},{pick:15,team:"Buccaneers"},{pick:16,team:"Jets"},{pick:17,team:"Lions"},{pick:18,team:"Vikings"},{pick:19,team:"Panthers"},{pick:20,team:"Cowboys"},{pick:21,team:"Steelers"},{pick:22,team:"Chargers"},{pick:23,team:"Eagles"},{pick:24,team:"Browns"},{pick:25,team:"Bears"},{pick:26,team:"Bills"},{pick:27,team:"49ers"},{pick:28,team:"Texans"},{pick:29,team:"Rams"},{pick:30,team:"Broncos"},{pick:31,team:"Patriots"},{pick:32,team:"Seahawks"}];
const NFL_TEAM_ABR={"Raiders":"LV","Jets":"NYJ","Cardinals":"ARI","Titans":"TEN","Giants":"NYG","Browns":"CLE","Commanders":"WAS","Saints":"NO","Chiefs":"KC","Bengals":"CIN","Dolphins":"MIA","Cowboys":"DAL","Rams":"LA","Ravens":"BAL","Buccaneers":"TB","Lions":"DET","Vikings":"MIN","Panthers":"CAR","Steelers":"PIT","Chargers":"LAC","Eagles":"PHI","Bears":"CHI","Bills":"BUF","49ers":"SF","Texans":"HOU","Broncos":"DEN","Patriots":"NE","Seahawks":"SEA","Falcons":"ATL","Colts":"IND","Jaguars":"JAX","Packers":"GB"};
const NFL_TEAM_ESPN={"Raiders":13,"Jets":20,"Cardinals":22,"Titans":10,"Giants":19,"Browns":5,"Commanders":28,"Saints":18,"Chiefs":12,"Bengals":4,"Dolphins":15,"Cowboys":6,"Rams":14,"Ravens":33,"Buccaneers":27,"Lions":8,"Vikings":16,"Panthers":29,"Steelers":23,"Chargers":24,"Eagles":21,"Bears":3,"Bills":2,"49ers":25,"Texans":34,"Broncos":7,"Patriots":17,"Seahawks":26,"Falcons":1,"Colts":11,"Jaguars":30,"Packers":9};
function nflLogo(team){const id=NFL_TEAM_ESPN[team];return id?`https://a.espncdn.com/i/teamlogos/nfl/500/${id}.png`:null;}
function NFLTeamLogo({team,size=20}){const[err,setErr]=useState(false);const url=nflLogo(team);if(!url||err)return<span style={{fontFamily:"monospace",fontSize:size*0.5,color:"#a3a3a3"}}>{NFL_TEAM_ABR[team]||team}</span>;return<img src={url} alt={team} width={size} height={size} onError={()=>setErr(true)} style={{objectFit:"contain",flexShrink:0}}/>;}
const MIN_COMPS=3;
// Sim remaining matchups using weighted consensus + user preference + randomness
function simRemainingMatchups(allMatchups,completedSet,currentRatings,ids,consensusRankFn){
  const r={...currentRatings};
  ids.forEach(id=>{if(!r[id])r[id]=INITIAL_ELO;});
  const remaining=allMatchups.filter(m=>!completedSet.has(`${m[0]}-${m[1]}`));
  const newCompleted=new Set(completedSet);
  remaining.forEach(([a,b])=>{
    const crA=consensusRankFn?.(a)||999;const crB=consensusRankFn?.(b)||999;
    // Consensus weight: lower rank = better
    const consensusFavorsA=crA<crB?0.65:crA>crB?0.35:0.5;
    // User preference weight: higher Elo = better
    const userFavorsA=expectedScore(r[a]||1500,r[b]||1500);
    // Blend: 60% consensus, 30% user preference, 10% random
    const blended=0.6*consensusFavorsA+0.3*userFavorsA+0.1*Math.random();
    const aWins=blended>0.5;
    // Use lower K for sim'd matchups (less impact per match)
    const{newA,newB}=eloUpdate(r[a]||1500,r[b]||1500,aWins,16);
    r[a]=newA;r[b]=newB;
    newCompleted.add(`${a}-${b}`);
  });
  return{ratings:r,completed:newCompleted};
}
const font=`'Literata',Georgia,serif`;const mono=`'DM Mono','Courier New',monospace`;const sans=`'DM Sans','Helvetica Neue',sans-serif`;

// ============================================================
// Components
// ============================================================
function SchoolLogo({school,size=32}){const[err,setErr]=useState(false);const url=schoolLogo(school);if(!url||err)return<div style={{width:size,height:size,borderRadius:"50%",background:"#f0f0f0",display:"flex",alignItems:"center",justifyContent:"center",fontSize:size*0.4,fontWeight:700,color:"#a3a3a3",flexShrink:0,fontFamily:"system-ui"}}>{school.charAt(0)}</div>;return<img src={url} alt={school} width={size} height={size} onError={()=>setErr(true)} style={{objectFit:"contain",flexShrink:0}}/>;}

function RadarChart({traits,values,color,size=180}){const cx=size/2,cy=size/2,r=size/2-24,n=traits.length;const angles=traits.map((_,i)=>(Math.PI*2*i)/n-Math.PI/2);const pv=angles.map((a,i)=>{const v=(values[i]||50)/100;return[cx+r*v*Math.cos(a),cy+r*v*Math.sin(a)];});return(<svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>{[.25,.5,.75,1].map(lv=><polygon key={lv} points={angles.map(a=>`${cx+r*lv*Math.cos(a)},${cy+r*lv*Math.sin(a)}`).join(" ")} fill="none" stroke="#e5e5e5" strokeWidth="0.5"/>)}{angles.map((a,i)=><line key={i} x1={cx} y1={cy} x2={cx+r*Math.cos(a)} y2={cy+r*Math.sin(a)} stroke="#e5e5e5" strokeWidth="0.5"/>)}<polygon points={pv.map(p=>p.join(",")).join(" ")} fill={`${color}18`} stroke={color} strokeWidth="2"/>{pv.map((p,i)=><circle key={i} cx={p[0]} cy={p[1]} r="3" fill={color}/>)}{traits.map((t,i)=>{const lr=r+14;return<text key={t} x={cx+lr*Math.cos(angles[i])} y={cy+lr*Math.sin(angles[i])} textAnchor="middle" dominantBaseline="middle" style={{fontSize:"8px",fill:"#737373",fontFamily:"monospace"}}>{t.split(" ").map(w=>w[0]).join("")}</text>;})}</svg>);}

function getSimilarPlayers(player,allProspects,traits,count=5){
  const pos=player.gpos||player.pos;const posTraits=POSITION_TRAITS[pos]||POSITION_TRAITS[player.pos]||[];
  const myVals=posTraits.map(t=>traits[player.id]?.[t]||50);
  const others=allProspects.filter(p=>(p.gpos||p.pos)===(player.gpos||player.pos)&&p.id!==player.id);
  const scored=others.map(p=>{
    const vals=posTraits.map(t=>traits[p.id]?.[t]||50);
    const dist=Math.sqrt(posTraits.reduce((sum,_,i)=>sum+Math.pow(myVals[i]-vals[i],2),0));
    return{player:p,distance:dist};
  });
  scored.sort((a,b)=>a.distance-b.distance);
  return scored.slice(0,count);
}

function PlayerProfile({player,traits,setTraits,notes,setNotes,allProspects,getGrade,onClose,onSelectPlayer,consensus,ratings}){
  const[isOpen,setIsOpen]=useState(false);
  useEffect(()=>{setTimeout(()=>setIsOpen(true),10);return()=>setIsOpen(false);},[player.id]);
  const handleClose=()=>{setIsOpen(false);setTimeout(onClose,300);};
  const c=POS_COLORS[player.gpos||player.pos]||POS_COLORS[player.pos];
  const posTraits=POSITION_TRAITS[player.gpos||player.pos]||POSITION_TRAITS[player.pos]||[];
  const ps=getProspectStats(player.name,player.school);
  const grade=getGrade(player.id);
  const similar=getSimilarPlayers(player,allProspects,traits,5);
  const gradeColor=grade>=75?"#16a34a":grade>=55?"#ca8a04":"#dc2626";
  return(
    <>
      <div onClick={handleClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.25)",zIndex:200,opacity:isOpen?1:0,transition:"opacity 0.3s",cursor:"pointer"}}/>
      <div style={{position:"fixed",top:0,right:0,bottom:0,width:Math.min(460,window.innerWidth-24),background:"#faf9f6",zIndex:201,boxShadow:"-8px 0 32px rgba(0,0,0,0.12)",transform:isOpen?"translateX(0)":"translateX(100%)",transition:"transform 0.3s cubic-bezier(0.16,1,0.3,1)",display:"flex",flexDirection:"column",overflowY:"auto",overflowX:"hidden"}}>
        <div style={{padding:"20px 24px 0",display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
          <button onClick={handleClose} style={{fontFamily:sans,fontSize:12,color:"#a3a3a3",background:"none",border:"1px solid #e5e5e5",borderRadius:99,padding:"5px 14px",cursor:"pointer"}}>✕ close</button>
          <span style={{fontFamily:mono,fontSize:10,fontWeight:500,color:c,background:`${c}0d`,padding:"4px 12px",borderRadius:4,border:`1px solid ${c}1a`}}>{player.gpos||player.pos}</span>
        </div>

        <div style={{padding:"24px 24px 0",textAlign:"center"}}>
          <SchoolLogo school={player.school} size={64}/>
          <div style={{fontFamily:font,fontSize:28,fontWeight:900,color:"#171717",marginTop:12,lineHeight:1.1}}>{player.name}</div>
          <div style={{fontFamily:mono,fontSize:13,color:"#a3a3a3",marginTop:4}}>{player.school}</div>
          <div style={{marginTop:16,display:"inline-flex",alignItems:"baseline",gap:6}}>
            <span style={{fontFamily:font,fontSize:48,fontWeight:900,color:gradeColor,lineHeight:1}}>{grade}</span>
            <span style={{fontFamily:mono,fontSize:10,letterSpacing:2,color:"#a3a3a3",textTransform:"uppercase"}}>grade</span>
          </div>
        </div>

        {ps&&<div style={{padding:"0 24px 16px"}}>
          {(ps.rank||ps.posRank)&&<div style={{textAlign:"center",marginBottom:8}}>
            <span style={{fontFamily:mono,fontSize:11,color:"#a3a3a3"}}>{ps.rank?"#"+ps.rank+" overall":""}{ps.posRank?" · "+(player.gpos||player.pos)+" #"+ps.posRank:""}</span>
          </div>}
          {(ps.height||ps.weight||ps.cls)&&<div style={{display:"flex",justifyContent:"center",gap:12,marginBottom:8,flexWrap:"wrap"}}>
            {[ps.height&&{label:"HT",val:ps.height},ps.weight&&{label:"WT",val:ps.weight+" lbs"},ps.cls&&{label:"YR",val:ps.cls}].filter(Boolean).map(({label,val})=>(
              <div key={label} style={{textAlign:"center",background:"#fff",border:"1px solid #e5e5e5",borderRadius:8,padding:"6px 12px",minWidth:60}}>
                <div style={{fontFamily:mono,fontSize:8,letterSpacing:1.5,color:"#a3a3a3",textTransform:"uppercase",marginBottom:2}}>{label}</div>
                <div style={{fontFamily:mono,fontSize:13,fontWeight:700,color:"#171717"}}>{val}</div>
              </div>
            ))}
          </div>}
          {ps.statLine&&<div style={{background:"#f9f9f6",border:"1px solid #f0f0f0",borderRadius:8,padding:"10px 14px",textAlign:"center"}}>
            <div style={{fontFamily:mono,fontSize:12,color:"#525252",lineHeight:1.4}}>{ps.statLine}</div>
            {ps.statExtra&&<div style={{fontFamily:mono,fontSize:11,color:"#a3a3a3",marginTop:4,lineHeight:1.4}}>{ps.statExtra}</div>}
          </div>}
        </div>}

        <div style={{padding:"24px",display:"flex",justifyContent:"center"}}>
          <RadarChart traits={posTraits} values={posTraits.map(t=>traits[player.id]?.[t]||50)} color={c} size={200}/>
        </div>

        <div style={{padding:"0 24px 16px"}}>
          {(()=>{const ceil=traits[player.id]?.__ceiling||"normal";const tiers=[
            {key:"capped",icon:"🔒",label:"Capped",desc:"What you see is what you get",bg:"linear-gradient(135deg, #1e1e1e, #2d2d2d)",border:"#404040",glow:"rgba(100,100,100,.3)",text:"#a3a3a3"},
            {key:"normal",icon:"📊",label:"Normal",desc:"Standard projection",bg:"linear-gradient(135deg, #1a1a2e, #16213e)",border:"#334155",glow:"rgba(99,102,241,.25)",text:"#94a3b8"},
            {key:"high",icon:"🔥",label:"High",desc:"The tools are there",bg:"linear-gradient(135deg, #312e1c, #3d2e0a)",border:"#854d0e",glow:"rgba(234,179,8,.3)",text:"#fbbf24"},
            {key:"elite",icon:"⭐",label:"Elite",desc:"Generational upside",bg:"linear-gradient(135deg, #1a0a2e, #2d1248)",border:"#7c3aed",glow:"rgba(139,92,246,.35)",text:"#a78bfa"}
          ];return(
            <div style={{marginBottom:20,paddingBottom:18,borderBottom:"1px solid #f0f0f0"}}>
              <div style={{fontFamily:mono,fontSize:10,letterSpacing:2,color:"#a3a3a3",textTransform:"uppercase",marginBottom:10}}>ceiling</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:6}}>
                {tiers.map(t=>{const sel=ceil===t.key;return(
                  <button key={t.key} onClick={()=>setTraits(prev=>({...prev,[player.id]:{...prev[player.id],__ceiling:t.key}}))}
                    style={{padding:"10px 6px 8px",background:sel?t.bg:"#fff",border:`1.5px solid ${sel?t.border:"#e5e5e5"}`,borderRadius:10,cursor:"pointer",textAlign:"center",transition:"all 0.2s",boxShadow:sel?`0 0 12px ${t.glow}, inset 0 1px 0 rgba(255,255,255,.05)`:"none",transform:sel?"scale(1.02)":"scale(1)",position:"relative",overflow:"hidden"}}
                    onMouseEnter={e=>{if(!sel){e.currentTarget.style.borderColor=t.border;e.currentTarget.style.transform="scale(1.02)";}}}
                    onMouseLeave={e=>{if(!sel){e.currentTarget.style.borderColor="#e5e5e5";e.currentTarget.style.transform="scale(1)";}}}>
                    <div style={{fontSize:18,lineHeight:1,marginBottom:4,filter:sel?"none":"grayscale(0.5) opacity(0.6)"}}>{t.icon}</div>
                    <div style={{fontFamily:sans,fontSize:11,fontWeight:700,color:sel?t.text:"#737373",lineHeight:1.1}}>{t.label}</div>
                    <div style={{fontFamily:mono,fontSize:8,color:sel?t.text:"#a3a3a3",opacity:sel?0.7:0.5,marginTop:2,lineHeight:1.2}}>{t.desc}</div>
                  </button>
                );})}
              </div>
            </div>
          );})()}
          <div style={{fontFamily:mono,fontSize:10,letterSpacing:2,color:"#a3a3a3",textTransform:"uppercase",marginBottom:12}}>traits</div>
          {posTraits.map(trait=>{const val=traits[player.id]?.[trait]||50;const emoji=TRAIT_EMOJI[trait]||"";const t=val/100;const r=Math.round(236+(124-236)*t);const g=Math.round(72+(58-72)*t);const b=Math.round(153+(237-153)*t);const barColor=`rgb(${r},${g},${b})`;return(
            <div key={trait} style={{marginBottom:16}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                <span style={{fontFamily:mono,fontSize:11,color:"#737373"}}>{trait}</span>
                <span style={{fontFamily:font,fontSize:14,fontWeight:900,color:barColor}}>{val}</span>
              </div>
              <div style={{position:"relative",height:24,display:"flex",alignItems:"center"}}>
                <div style={{position:"absolute",left:0,right:0,height:6,background:"#f0f0f0",borderRadius:3}}/>
                <div style={{position:"absolute",left:0,height:6,width:`${val}%`,background:"linear-gradient(90deg, #ec4899, #7c3aed)",borderRadius:3}}/>
                <div style={{position:"absolute",left:`${val}%`,transform:"translateX(-50%)",fontSize:18,lineHeight:1,pointerEvents:"none",zIndex:3,filter:"drop-shadow(0 1px 2px rgba(0,0,0,.15))"}}>{emoji}</div>
                <input type="range" min="0" max="100" value={val}
                  onChange={e=>setTraits(prev=>({...prev,[player.id]:{...prev[player.id],[trait]:parseInt(e.target.value)}}))}
                  style={{position:"absolute",left:0,width:"100%",height:24,background:"transparent",cursor:"pointer",zIndex:4,opacity:0,margin:0}}/>
              </div>
            </div>
          );})}
        </div>

        <div style={{padding:"0 24px 16px"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
            <div style={{fontFamily:mono,fontSize:10,letterSpacing:2,color:"#a3a3a3",textTransform:"uppercase"}}>scouting notes</div>
            {notes?.[player.id]&&<div style={{fontFamily:mono,fontSize:9,color:"#22c55e",opacity:0.7}}>✓ saved</div>}
          </div>
          <textarea value={notes?.[player.id]||""} onChange={e=>setNotes(prev=>({...prev,[player.id]:e.target.value}))}
            placeholder="Add your scouting notes..."
            style={{width:"100%",minHeight:80,fontFamily:sans,fontSize:13,padding:"10px 12px",border:"1px solid #e5e5e5",borderRadius:8,background:"#fff",color:"#171717",resize:"vertical",outline:"none",lineHeight:1.5,boxSizing:"border-box"}}
            onFocus={e=>e.target.style.borderColor=c} onBlur={e=>e.target.style.borderColor="#e5e5e5"}/>
        </div>

        {(()=>{const cr=consensus?.find(x=>x.name===player.name);const userRank=allProspects.filter(p=>(p.gpos||p.pos)===(player.gpos||player.pos)).sort((a,b)=>(ratings?.[b.id]||1500)-(ratings?.[a.id]||1500)).findIndex(p=>p.id===player.id)+1;return cr?(
          <div style={{padding:"0 24px 16px"}}>
            <div style={{fontFamily:mono,fontSize:10,letterSpacing:2,color:"#a3a3a3",textTransform:"uppercase",marginBottom:8}}>vs consensus</div>
            <div style={{background:"#fff",border:"1px solid #e5e5e5",borderRadius:8,padding:"12px 14px",display:"flex",gap:20,justifyContent:"center"}}>
              <div style={{textAlign:"center"}}><div style={{fontFamily:mono,fontSize:9,color:"#a3a3a3",marginBottom:2}}>CONSENSUS</div><div style={{fontFamily:font,fontSize:22,fontWeight:900,color:"#171717"}}>#{cr.rank}</div></div>
              <div style={{textAlign:"center"}}><div style={{fontFamily:mono,fontSize:9,color:"#a3a3a3",marginBottom:2}}>YOUR RANK (POS)</div><div style={{fontFamily:font,fontSize:22,fontWeight:900,color:userRank<cr.rank?"#16a34a":userRank>cr.rank?"#dc2626":"#171717"}}>#{userRank}</div></div>
              <div style={{textAlign:"center"}}><div style={{fontFamily:mono,fontSize:9,color:"#a3a3a3",marginBottom:2}}>DIFF</div><div style={{fontFamily:font,fontSize:22,fontWeight:900,color:cr.rank-userRank>0?"#16a34a":cr.rank-userRank<0?"#dc2626":"#a3a3a3"}}>{cr.rank-userRank>0?"+":""}{cr.rank-userRank===0?"—":cr.rank-userRank}</div></div>
            </div>
          </div>
        ):null;})()}

        <div style={{padding:"0 24px 32px"}}>
          <div style={{fontFamily:mono,fontSize:10,letterSpacing:2,color:"#a3a3a3",textTransform:"uppercase",marginBottom:12}}>similar profiles</div>
          <div style={{background:"#fff",border:"1px solid #e5e5e5",borderRadius:12,overflow:"hidden"}}>
            {similar.map(({player:sp,distance},i)=>{
              const sg=getGrade(sp.id);const matchPct=Math.max(0,Math.round(100-distance/3));
              return(
                <div key={sp.id} onClick={()=>onSelectPlayer(sp)} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",borderBottom:i<similar.length-1?"1px solid #f5f5f5":"none",cursor:"pointer",transition:"background 0.1s"}}
                  onMouseEnter={e=>e.currentTarget.style.background=`${c}06`} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                  <SchoolLogo school={sp.school} size={24}/>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontFamily:sans,fontSize:13,fontWeight:600,color:"#171717"}}>{sp.name}</div>
                    <div style={{fontFamily:mono,fontSize:10,color:"#a3a3a3"}}>{sp.school}</div>
                  </div>
                  <div style={{textAlign:"right",flexShrink:0}}>
                    <div style={{fontFamily:font,fontSize:14,fontWeight:900,color:sg>=75?"#16a34a":sg>=55?"#ca8a04":"#dc2626"}}>{sg}</div>
                    <div style={{fontFamily:mono,fontSize:9,color:"#a3a3a3"}}>{matchPct}% match</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}

// ============================================================
// Auth Screen
// ============================================================
function AuthScreen({onSignIn}){
  const[email,setEmail]=useState('');const[sent,setSent]=useState(false);const[loading,setLoading]=useState(false);const[error,setError]=useState('');const[showEmail,setShowEmail]=useState(false);

  const handleGoogle=async()=>{
    const{error:err}=await supabase.auth.signInWithOAuth({provider:'google',options:{redirectTo:window.location.origin}});
    if(err)setError(err.message);
  };

  const handleSend=async()=>{
    if(!email.includes('@')){setError('enter a valid email');return;}
    setLoading(true);setError('');
    const{error:err}=await supabase.auth.signInWithOtp({email,options:{emailRedirectTo:window.location.origin}});
    if(err){setError(err.message);setLoading(false);}else{setSent(true);setLoading(false);}
  };

  const features=[
    {emoji:"⚖️",title:"Pair-by-pair prospect ranking",desc:"No spreadsheets. Choose between two players, head-to-head, until your board builds itself."},
    {emoji:"🎚️",title:"Grade every prospect with sliders",desc:"Arm strength, burst, coverage instincts — dial in traits and watch grades update in real time."},
    {emoji:"🧠",title:"32 AI GMs with real personalities",desc:"Each CPU team drafts differently. The Bengals take BPA. The Saints reach. The Eagles play dynasty."},
    {emoji:"🔄",title:"CPU teams trade with each other",desc:"Watch the Rams trade up to steal your guy. Just like real draft night."},
    {emoji:"📋",title:"Live depth chart updates",desc:"Every pick lands on the roster in real time. See starters displaced and needs filled."},
    {emoji:"🎯",title:"Every pick graded instantly",desc:"Steal, value, or reach — get a verdict on every selection and see how your draft stacks up."},
  ];

  return(
    <div style={{minHeight:"100vh",background:"#faf9f6",fontFamily:font}}>
      {/* Hero */}
      <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"80px 24px 32px",textAlign:"center"}}>
        <img src="/logo.png" alt="Big Board Lab" style={{width:100,height:"auto",marginBottom:16}}/>
        <p style={{fontFamily:mono,fontSize:11,letterSpacing:3,color:"#a3a3a3",textTransform:"uppercase",margin:"0 0 12px"}}>2026 NFL Draft</p>
        <h1 style={{fontSize:48,fontWeight:900,lineHeight:0.95,color:"#171717",margin:"0 0 16px",letterSpacing:-2}}>big board lab</h1>
        <p style={{fontFamily:sans,fontSize:18,color:"#525252",lineHeight:1.5,maxWidth:480,margin:"0 auto"}}>Rank prospects. Grade them your way. Run the most realistic mock draft ever built.</p>
      </div>

      {/* Sign In */}
      <div style={{maxWidth:400,margin:"0 auto",padding:"0 24px 24px"}}>
        <div style={{background:"#fff",border:"1px solid #e5e5e5",borderRadius:16,padding:28}}>
          {!sent?(
            <>
              <button onClick={handleGoogle}
                style={{width:"100%",fontFamily:sans,fontSize:14,fontWeight:700,padding:"14px",background:"#fff",color:"#171717",border:"1px solid #e5e5e5",borderRadius:99,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:10,marginBottom:16,transition:"background 0.15s"}}
                onMouseEnter={e=>e.currentTarget.style.background="#f5f5f5"} onMouseLeave={e=>e.currentTarget.style.background="#fff"}>
                <svg width="18" height="18" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                continue with Google
              </button>
              {error&&<p style={{fontFamily:sans,fontSize:12,color:"#dc2626",marginBottom:12,textAlign:"center"}}>{error}</p>}
              {!showEmail?(
                <button onClick={()=>setShowEmail(true)} style={{width:"100%",fontFamily:sans,fontSize:12,color:"#a3a3a3",background:"none",border:"none",cursor:"pointer",textAlign:"center",padding:"8px 0"}}>or sign in with email</button>
              ):(
                <>
                  <div style={{display:"flex",alignItems:"center",gap:12,margin:"4px 0 16px"}}><div style={{flex:1,height:1,background:"#e5e5e5"}}/><span style={{fontFamily:mono,fontSize:9,color:"#d4d4d4",letterSpacing:1}}>OR</span><div style={{flex:1,height:1,background:"#e5e5e5"}}/></div>
                  <label style={{fontFamily:mono,fontSize:10,letterSpacing:1.5,color:"#a3a3a3",textTransform:"uppercase",display:"block",marginBottom:6}}>email</label>
                  <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@email.com" type="email"
                    onKeyDown={e=>e.key==='Enter'&&handleSend()}
                    style={{width:"100%",fontFamily:sans,fontSize:16,padding:"12px 14px",border:"1px solid #e5e5e5",borderRadius:10,outline:"none",background:"#faf9f6",color:"#171717",marginBottom:16,transition:"border-color 0.15s"}}
                    onFocus={e=>e.target.style.borderColor="#171717"} onBlur={e=>e.target.style.borderColor="#e5e5e5"}/>
                  <button onClick={handleSend} disabled={loading}
                    style={{width:"100%",fontFamily:sans,fontSize:14,fontWeight:700,padding:"14px",background:"#171717",color:"#faf9f6",border:"none",borderRadius:99,cursor:loading?"wait":"pointer",opacity:loading?0.6:1}}>
                    {loading?'sending...':'send magic link'}
                  </button>
                </>
              )}
            </>
          ):(
            <div style={{textAlign:"center",padding:"12px 0"}}>
              <div style={{fontSize:32,marginBottom:12}}>✉️</div>
              <p style={{fontFamily:sans,fontSize:16,fontWeight:700,color:"#171717",marginBottom:8}}>check your email</p>
              <p style={{fontFamily:sans,fontSize:13,color:"#a3a3a3",lineHeight:1.5}}>we sent a magic link to <strong style={{color:"#171717"}}>{email}</strong>. click it to sign in.</p>
              <button onClick={()=>{setSent(false);setEmail('');setShowEmail(false);}} style={{fontFamily:sans,fontSize:12,color:"#a3a3a3",background:"none",border:"none",cursor:"pointer",marginTop:16,textDecoration:"underline",textUnderlineOffset:3}}>try a different email</button>
            </div>
          )}
        </div>
        <div style={{textAlign:"center",marginTop:12}}>
          <p style={{fontFamily:sans,fontSize:11,color:"#a3a3a3",margin:0}}>free to use · no credit card required</p>
        </div>
      </div>

      {/* Prospect Stock Ticker */}
      {(()=>{
        const posColors={QB:"#ec4899",RB:"#22c55e",WR:"#7c3aed",TE:"#f97316",OT:"#3b82f6",IOL:"#3b82f6",OL:"#3b82f6",EDGE:"#06b6d4",DL:"#64748b",LB:"#1d4ed8",CB:"#eab308",S:"#eab308",K:"#a3a3a3",P:"#a3a3a3"};
        const cb=PROSPECTS.filter(p=>{const cr=getConsensusRank(p.name);return cr&&cr<999;}).sort((a,b)=>getConsensusRank(a.name)-getConsensusRank(b.name));
        const seed=42;const rng=(i)=>{let s=seed+i*2654435761;s=((s^(s>>>16))*0x45d9f3b)>>>0;return(s&0xffff)/0xffff;};
        const tickerData=cb.slice(0,80).map((p,i)=>{
          const variance=Math.round((rng(i)-0.4)*12);
          if(Math.abs(variance)<2)return null;
          return{name:p.name,pos:p.gpos||p.pos,delta:variance};
        }).filter(Boolean);
        const risers=tickerData.filter(d=>d.delta<0).sort((a,b)=>a.delta-b.delta).slice(0,20);
        const fallers=tickerData.filter(d=>d.delta>0).sort((a,b)=>b.delta-a.delta).slice(0,20);
        const risersLoop=[...risers,...risers];
        const fallersLoop=[...fallers,...fallers];
        const ps=(d)=>({display:"inline-flex",alignItems:"center",gap:5,padding:"4px 10px",borderRadius:99,flexShrink:0,background:d.delta<0?"rgba(34,197,94,0.08)":"rgba(239,68,68,0.08)",border:`1px solid ${d.delta<0?"rgba(34,197,94,0.15)":"rgba(239,68,68,0.15)"}`});
        if(risers.length===0&&fallers.length===0)return null;
        return<div style={{maxWidth:780,margin:"0 auto",padding:"0 24px 24px"}}>
          <div style={{overflow:"hidden",borderRadius:12,background:"#fff",border:"1px solid #e5e5e5",padding:"10px 0"}}>
            <div style={{fontFamily:mono,fontSize:8,letterSpacing:2,color:"#a3a3a3",textTransform:"uppercase",padding:"0 16px 8px",display:"flex",justifyContent:"space-between"}}>
              <span>📈 mock draft risers</span><span>mock draft fallers 📉</span>
            </div>
            <div style={{overflow:"hidden",marginBottom:6}}>
              <div style={{display:"flex",gap:8,animation:"tickerRight 35s linear infinite",width:"max-content"}}>
                {risersLoop.map((d,i)=><div key={`r${i}`} style={ps(d)}>
                  <span style={{fontFamily:mono,fontSize:9,fontWeight:700,color:posColors[d.pos]||"#525252"}}>{d.pos}</span>
                  <span style={{fontFamily:sans,fontSize:11,fontWeight:600,color:"#171717"}}>{d.name.split(" ").pop()}</span>
                  <span style={{fontFamily:mono,fontSize:10,fontWeight:700,color:"#22c55e"}}>↑{Math.abs(d.delta)}</span>
                </div>)}
              </div>
            </div>
            <div style={{overflow:"hidden"}}>
              <div style={{display:"flex",gap:8,animation:"tickerLeft 40s linear infinite",width:"max-content"}}>
                {fallersLoop.map((d,i)=><div key={`f${i}`} style={ps(d)}>
                  <span style={{fontFamily:mono,fontSize:9,fontWeight:700,color:posColors[d.pos]||"#525252"}}>{d.pos}</span>
                  <span style={{fontFamily:sans,fontSize:11,fontWeight:600,color:"#171717"}}>{d.name.split(" ").pop()}</span>
                  <span style={{fontFamily:mono,fontSize:10,fontWeight:700,color:"#ef4444"}}>↓{d.delta}</span>
                </div>)}
              </div>
            </div>
            <style>{`
              @keyframes tickerRight{0%{transform:translateX(-50%)}100%{transform:translateX(0%)}}
              @keyframes tickerLeft{0%{transform:translateX(0%)}100%{transform:translateX(-50%)}}
            `}</style>
          </div>
        </div>;
      })()}

      {/* Features */}
      <div style={{maxWidth:780,margin:"0 auto",padding:"0 24px 40px",display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(280px, 1fr))",gap:12}}>
        {features.map((f,i)=>(
          <div key={i} style={{background:"#fff",border:"1px solid #e5e5e5",borderRadius:12,padding:"20px 22px",display:"flex",gap:14,alignItems:"flex-start"}}>
            <span style={{fontSize:22,lineHeight:1,flexShrink:0,marginTop:1}}>{f.emoji}</span>
            <div>
              <div style={{fontFamily:sans,fontSize:13,fontWeight:700,color:"#171717",marginBottom:4}}>{f.title}</div>
              <div style={{fontFamily:sans,fontSize:12,color:"#737373",lineHeight:1.45}}>{f.desc}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Privacy */}
      <div style={{textAlign:"center",padding:"0 24px 60px"}}>
        <a href="/privacy.html" style={{fontFamily:mono,fontSize:10,color:"#a3a3a3",textDecoration:"none"}} onMouseEnter={e=>e.currentTarget.style.textDecoration="underline"} onMouseLeave={e=>e.currentTarget.style.textDecoration="none"}>privacy policy</a>
      </div>
    </div>
  );
}

// ============================================================
// Main Board App (post-auth)
// ============================================================
function DraftBoard({user,onSignOut}){
  const[phase,setPhase]=useState("loading");
  const[activePos,setActivePos]=useState(null);
  const[ratings,setRatings]=useState({});
  const[completed,setCompleted]=useState({});
  const[matchups,setMatchups]=useState({});
  const[currentMatchup,setCurrentMatchup]=useState(null);
  const[traits,setTraits]=useState({});
  const[rankedGroups,setRankedGroups]=useState(new Set());
  const[traitReviewedGroups,setTraitReviewedGroups]=useState(new Set());
  const[selectedPlayer,setSelectedPlayer]=useState(null);
  const[reconcileQueue,setReconcileQueue]=useState([]);
  const[reconcileIndex,setReconcileIndex]=useState(0);
  const[compCount,setCompCount]=useState({});
  const[winCount,setWinCount]=useState({});
  const[showConfidence,setShowConfidence]=useState(false);
  const[pendingWinner,setPendingWinner]=useState(null);
  const[compareList,setCompareList]=useState([]);
  const[saving,setSaving]=useState(false);
  const[lastSaved,setLastSaved]=useState(null);
  const[profilePlayer,setProfilePlayer]=useState(null);
  const[notes,setNotes]=useState({});
  const[partialProgress,setPartialProgress]=useState({}); // {pos: {matchups:[], completed:Set, ratings:{}}}
  const[communityBoard,setCommunityBoard]=useState(null);
  const[showMockDraft,setShowMockDraft]=useState(false);
  const[mockLaunchTeam,setMockLaunchTeam]=useState(null);// Set of teams or null
  const[mockTeamPicker,setMockTeamPicker]=useState("");
  const[mockTeamSet,setMockTeamSet]=useState(new Set());
  const[mockRounds,setMockRounds]=useState(1);
  const[mockSpeed,setMockSpeed]=useState(50);
  const[mockCpuTrades,setMockCpuTrades]=useState(true);
  const[mockBoardMode,setMockBoardMode]=useState("consensus");
  useEffect(()=>{if(showMockDraft)trackEvent(user.id,'mock_draft_started');},[showMockDraft]);
  const[boardTab,setBoardTab]=useState("consensus");
  const[boardFilter,setBoardFilter]=useState(new Set());
  useEffect(()=>{if(rankedGroups.size>0)setBoardTab("my");},[rankedGroups.size]);
  const[lockedPlayer,setLockedPlayer]=useState(null);
  const[showOnboarding,setShowOnboarding]=useState(()=>{try{return !localStorage.getItem('bbl_onboarded');}catch(e){return true;}});

  // Consensus Top 50 (aggregated from major draft media)
  const CONSENSUS=useMemo(()=>["Cam Ward","Abdul Carter","Travis Hunter","Tetairoa McMillan","Will Johnson","Mason Graham","Shedeur Sanders","Tyler Warren","Ashton Jeanty","Will Campbell","Kelvin Banks Jr.","Mykel Williams","James Pearce Jr.","Luther Burden III","Malaki Starks","Jalen Milroe","Kenneth Grant","Colston Loveland","Jalon Walker","Emeka Egbuka","Derrick Harmon","Aireontae Ersery","Nic Scourton","Josh Simmons","Shavon Revel Jr.","Tyleik Williams","Benjamin Morrison","Sheild Sanders","Walter Nolen","Jack Sawyer","Omarion Hampton","Nick Singleton","Grey Zabel","Mike Matthews","Tate Ratledge","Donovan Jackson","Princely Umanmielen","Kevin Winston Jr.","David Hicks Jr.","Wyatt Milum","J.T. Tuimoloau","Tre Harris","Deone Walker","Quinshon Judkins","Landon Jackson","Isaiah Bond","Quinn Ewers","Dillon Gabriel","Carson Beck","Drew Allar"].map((name,i)=>({name,rank:i+1})),[]);

  // Team needs for mock draft
  const TEAM_NEEDS=useMemo(()=>({"Raiders":["QB","WR","CB"],"Jets":["OL","WR","DL"],"Cardinals":["OL","DL","DB"],"Titans":["DL","WR","OL"],"Giants":["WR","OL","QB"],"Browns":["QB","WR","OL"],"Commanders":["DL","OL","DB"],"Saints":["QB","OL","DL"],"Chiefs":["WR","OL","DB"],"Bengals":["OL","DL","DB"],"Dolphins":["QB","OL","DL"],"Cowboys":["DL","DB","OL"],"Rams":["DB","DL","OL"],"Ravens":["DL","WR","OL"],"Buccaneers":["OL","WR","DL"],"Lions":["DL","DB","LB"],"Vikings":["OL","DL","DB"],"Panthers":["DB","LB","DL"],"Steelers":["QB","WR","OL"],"Chargers":["OL","DL","LB"],"Eagles":["DL","LB","DB"],"Bears":["WR","OL","DB"],"Bills":["OL","WR","DL"],"49ers":["WR","DB","DL"],"Texans":["OL","DL","DB"],"Broncos":["OL","WR","DL"],"Patriots":["OL","WR","DL"],"Seahawks":["DL","OL","LB"]}),[]);

  // Load board from Supabase on mount
  useEffect(()=>{
    (async()=>{
      const{data}=await supabase.from('boards').select('board_data,updated_at').eq('user_id',user.id).single();
      if(data?.board_data){
        const d=data.board_data;
        // Migrate old position group keys (OL->OT/IOL, DL->EDGE/DL, DB->CB/S)
        let rg=d.rankedGroups||[];
        const OLD_TO_NEW={"OL":["OT","IOL"],"DB":["CB","S"]};
        let migrated=false;
        const newRg=[];
        rg.forEach(g=>{if(OLD_TO_NEW[g]){OLD_TO_NEW[g].forEach(n=>newRg.push(n));migrated=true;}else{newRg.push(g);}});
        if(migrated)rg=newRg;
        if(d.ratings)setRatings(d.ratings);
        if(d.traits)setTraits(d.traits);
        if(rg.length>0)setRankedGroups(new Set(rg));
        if(d.traitReviewedGroups)setTraitReviewedGroups(new Set(d.traitReviewedGroups));
        if(d.compCount)setCompCount(d.compCount);
        if(d.notes)setNotes(d.notes);
        if(d.partialProgress){
          // Restore partial progress — convert completed arrays back to Sets
          const pp={};
          Object.entries(d.partialProgress).forEach(([pos,data])=>{
            pp[pos]={matchups:data.matchups||[],completed:new Set(data.completed||[]),ratings:data.ratings||{}};
          });
          setPartialProgress(pp);
        }
        setLastSaved(data.updated_at);
        setPhase(rg.length>0?"pick-position":"home");
      }else{setPhase("home");}
    })();
  },[user.id]);

  // Auto-save debounced
  const saveTimer=useRef(null);
  useEffect(()=>{
    if(phase==="loading")return;
    if(saveTimer.current)clearTimeout(saveTimer.current);
    saveTimer.current=setTimeout(async()=>{
      if(rankedGroups.size===0&&Object.keys(ratings).length===0)return;
      setSaving(true);
      const ppSerialized={};
      Object.entries(partialProgress).forEach(([pos,data])=>{
        ppSerialized[pos]={matchups:data.matchups||[],completed:[...(data.completed||[])],ratings:data.ratings||{}};
      });
      const boardData={ratings,traits,rankedGroups:[...rankedGroups],traitReviewedGroups:[...traitReviewedGroups],compCount,notes,partialProgress:ppSerialized};
      const{error}=await supabase.from('boards').upsert({user_id:user.id,board_data:boardData},{onConflict:'user_id'});
      if(!error)setLastSaved(new Date().toISOString());
      // Also save to community board for aggregation
      if(rankedGroups.size>0){
        try{
          const communityData={};
          PROSPECTS.filter(p=>{const g=p.gpos||p.pos;const group=(g==="K"||g==="P"||g==="LS")?"K/P":g;return rankedGroups.has(group);}).forEach(p=>{communityData[p.id]=ratings[p.id]||1500;});
          await supabase.from('community_boards').upsert({user_id:user.id,board_data:communityData},{onConflict:'user_id'});
        }catch(e){}
      }
      setSaving(false);
    },2000);
    return()=>{if(saveTimer.current)clearTimeout(saveTimer.current);};
  },[ratings,traits,rankedGroups,traitReviewedGroups,compCount,notes,partialProgress,user.id,phase]);

  const prospectsMap=useMemo(()=>{const m={};PROSPECTS.forEach(p=>m[p.id]=p);return m;},[]);
  const byPos=useMemo(()=>{const m={};PROSPECTS.forEach(p=>{const g=p.gpos||p.pos;const group=(g==="K"||g==="P"||g==="LS")?"K/P":g;if(!m[group])m[group]=[];m[group].push(p);});return m;},[]);
  const posRankFn=useCallback((id)=>{const p=prospectsMap[id];if(!p)return 999;const ps=getProspectStats(p.name,p.school);return ps?.posRank||getConsensusRank(p.name)||999;},[prospectsMap]);
  const startRanking=useCallback((pos,resume=false)=>{
    setLockedPlayer(null);
    trackEvent(user.id,'ranking_started',{position:pos,resume});
    const ids=(byPos[pos]||[]).map(p=>p.id);
    const consensusRankFn=(id)=>{const p=prospectsMap[id];if(!p)return 999;const ps=getProspectStats(p.name,p.school);return ps?.posRank||getConsensusRank(p.name)||999;};
    let allM,doneSet,r,c;
    if(resume&&partialProgress[pos]){
      // Resume from saved state
      allM=partialProgress[pos].matchups;
      doneSet=new Set(partialProgress[pos].completed);
      r={...ratings,...partialProgress[pos].ratings};
      c={...compCount};
      ids.forEach(id=>{if(!r[id])r[id]=INITIAL_ELO;if(!c[id])c[id]=0;});
    }else{
      // Fresh start
      allM=generateMatchups(ids,consensusRankFn);
      doneSet=new Set();
      r={...ratings};c={...compCount};
      ids.forEach(id=>{if(!r[id])r[id]=INITIAL_ELO;if(!c[id])c[id]=0;});
    }
    setRatings(r);setCompCount(c);
    setCompleted(prev=>({...prev,[pos]:doneSet}));
    setMatchups(prev=>({...prev,[pos]:allM}));
    const next=getNextMatchup(allM,doneSet,r,c,posRankFn,null);
    if(!next){finishRanking(pos,r);return;}
    setCurrentMatchup(next);
    setActivePos(pos);setPhase("ranking");window.scrollTo(0,0);
  },[ratings,compCount,byPos,partialProgress,prospectsMap,posRankFn]);
  const handlePick=useCallback((winnerId,confidence=0.5)=>{if(!currentMatchup||!activePos)return;const[a,b]=currentMatchup;const aWon=winnerId===a;const k=24+(confidence*24);const{newA,newB}=eloUpdate(ratings[a]||1500,ratings[b]||1500,aWon,k);const ur={...ratings,[a]:newA,[b]:newB};setRatings(ur);const uc={...compCount,[a]:(compCount[a]||0)+1,[b]:(compCount[b]||0)+1};setCompCount(uc);setWinCount(prev=>({...prev,[winnerId]:(prev[winnerId]||0)+1}));const ns=new Set(completed[activePos]);ns.add(`${a}-${b}`);setCompleted(prev=>({...prev,[activePos]:ns}));
    // Save partial progress for resume
    setPartialProgress(prev=>({...prev,[activePos]:{matchups:matchups[activePos]||[],completed:ns,ratings:ur}}));
    const next=getNextMatchup(matchups[activePos],ns,ur,uc,posRankFn,lockedPlayer);if(!next){if(lockedPlayer){setLockedPlayer(null);const nextUnlocked=getNextMatchup(matchups[activePos],ns,ur,uc,posRankFn,null);if(!nextUnlocked)finishRanking(activePos,ur);else setCurrentMatchup(nextUnlocked);}else{finishRanking(activePos,ur);}}else setCurrentMatchup(next);setShowConfidence(false);setPendingWinner(null);},[currentMatchup,activePos,ratings,completed,matchups,compCount,posRankFn,lockedPlayer]);
  const canFinish=useMemo(()=>{if(!activePos||!byPos[activePos])return false;return byPos[activePos].every(p=>(compCount[p.id]||0)>=MIN_COMPS);},[activePos,byPos,compCount]);
  const canSim=useMemo(()=>{if(!activePos)return false;const doneCount=(completed[activePos]||new Set()).size;return doneCount>=20;},[activePos,completed]);
  const simAndFinish=useCallback((pos)=>{
    const ids=(byPos[pos]||[]).map(p=>p.id);
    const currentCompleted=completed[pos]||partialProgress[pos]?.completed||new Set();
    const currentMatchups=matchups[pos]||partialProgress[pos]?.matchups||[];
    const consensusRankFn=(id)=>{const p=prospectsMap[id];if(!p)return 999;const ps=getProspectStats(p.name,p.school);return ps?.posRank||getConsensusRank(p.name)||999;};
    // Get currently ranked top N (the ones user manually ranked)
    const manuallyRanked=[...ids].sort((a,b)=>(ratings[b]||1500)-(ratings[a]||1500));
    const topN=manuallyRanked.slice(0,Math.min(10,ids.filter(id=>(compCount[id]||0)>=MIN_COMPS).length||10));
    // Sim remaining matchups
    const result=simRemainingMatchups(currentMatchups,currentCompleted,ratings,ids,consensusRankFn);
    // Merge ratings but ensure manually-ranked top players stay on top
    const merged={...result.ratings};
    // Get max rating from sim'd results for unranked players
    const topRating=Math.max(...topN.map(id=>merged[id]||1500));
    // Ensure all manually-ranked top players are above all sim'd players
    topN.forEach((id,i)=>{merged[id]=topRating+100-i;});
    setRatings(prev=>({...prev,...merged}));
    setCompleted(prev=>({...prev,[pos]:result.completed}));
    // Clear partial progress for this position
    setPartialProgress(prev=>{const n={...prev};delete n[pos];return n;});
    finishRanking(pos,merged);
  },[byPos,completed,matchups,ratings,compCount,prospectsMap,partialProgress]);
  const finishRanking=useCallback((pos,r)=>{const rts=r||ratings;const sorted=[...(byPos[pos]||[])].sort((a,b)=>(rts[b.id]||1500)-(rts[a.id]||1500));const nt={...traits};const posTraits=POSITION_TRAITS[pos]||POSITION_TRAITS[sorted[0]?.pos]||[];const weights=TRAIT_WEIGHTS[pos]||TRAIT_WEIGHTS["QB"];
    // Step 1: Generate initial traits based on Elo rank
    sorted.forEach((p,i)=>{if(!nt[p.id])nt[p.id]={};if(nt[p.id].__ceiling==null)nt[p.id].__ceiling="normal";const base=Math.round(85-(i/Math.max(sorted.length-1,1))*50);(POSITION_TRAITS[p.gpos||p.pos]||POSITION_TRAITS[p.pos]||[]).forEach(t=>{nt[p.id][t]=Math.max(10,Math.min(99,base+Math.floor(Math.random()*16)-8));});});
    // Step 2: Compute grade for a player given traits
    const computeGrade=(id)=>{const t=nt[id];if(!t)return 50;const pt=POSITION_TRAITS[pos]||[];let tw=0,tv=0;pt.forEach(trait=>{const w=weights[trait]||1/pt.length;const v=t[trait]||50;tw+=w;tv+=v*w;});return tw>0?tv/tw:50;};
    // Step 3: Reconcile — scale traits so grades strictly decrease with rank
    for(let pass=0;pass<10;pass++){let clean=true;for(let i=1;i<sorted.length;i++){const prev=computeGrade(sorted[i-1].id);const cur=computeGrade(sorted[i].id);if(cur>=prev){clean=false;const target=prev-1;if(cur>0){const ratio=Math.max(0.5,target/cur);const pt=POSITION_TRAITS[sorted[i].gpos||sorted[i].pos]||[];pt.forEach(trait=>{nt[sorted[i].id][trait]=Math.max(10,Math.round((nt[sorted[i].id][trait]||50)*ratio));});}}}if(clean)break;}
    setTraits(nt);setRankedGroups(prev=>new Set([...prev,pos]));setPartialProgress(prev=>{const n={...prev};delete n[pos];return n;});trackEvent(user.id,'ranking_completed',{position:pos});setPhase("pick-position");window.scrollTo(0,0);},[ratings,byPos,traits,user.id]);
  const getRanked=useCallback((pos)=>[...(byPos[pos]||[])].sort((a,b)=>(ratings[b.id]||1500)-(ratings[a.id]||1500)),[byPos,ratings]);
  const movePlayer=useCallback((pos,fromIdx,toIdx)=>{
    if(fromIdx===toIdx)return;
    const ranked=getRanked(pos);
    const player=ranked[fromIdx];
    if(!player)return;
    // Set the moved player's rating to be between its new neighbors
    const newRatings={...ratings};
    if(toIdx===0){
      newRatings[player.id]=(newRatings[ranked[0].id]||1500)+10;
    }else if(toIdx>=ranked.length-1){
      newRatings[player.id]=(newRatings[ranked[ranked.length-1].id]||1500)-10;
    }else{
      const above=toIdx<fromIdx?ranked[toIdx]:ranked[toIdx+1];
      const below=toIdx<fromIdx?ranked[toIdx-1]:ranked[toIdx];
      newRatings[player.id]=((newRatings[above?.id]||1500)+(newRatings[below?.id]||1500))/2;
    }
    setRatings(newRatings);
  },[getRanked,ratings]);
  const getGrade=useCallback((id)=>{const t=traits[id];if(!t||Object.keys(t).length===0){
    const p=PROSPECTS.find(x=>x.id===id);if(!p)return 50;
    return getConsensusGrade(p.name);
  }const p=PROSPECTS.find(x=>x.id===id);const pos=p?(p.gpos||p.pos):"QB";const weights=TRAIT_WEIGHTS[pos]||TRAIT_WEIGHTS["QB"];const posTraits=POSITION_TRAITS[pos]||[];let totalW=0,totalV=0;posTraits.forEach(trait=>{const w=weights[trait]||1/posTraits.length;const v=t[trait]||50;totalW+=w;totalV+=v*w;});const base=totalW>0?totalV/totalW:50;const ceil=t.__ceiling;if(!ceil||ceil==="normal")return Math.round(base);let rawW=0,rawV=0;posTraits.forEach(trait=>{const teach=TRAIT_TEACHABILITY[trait]??0.5;if(teach<0.4){const w=weights[trait]||1/posTraits.length;rawW+=w;rawV+=(t[trait]||50)*w;}});const rawScore=rawW>0?rawV/rawW:base;const gap=rawScore-base;if(ceil==="high")return Math.max(1,Math.min(99,Math.round(base+Math.max(gap*0.5,0)+4)));if(ceil==="elite")return Math.max(1,Math.min(99,Math.round(base+Math.max(gap*0.7,0)+7)));if(ceil==="capped")return Math.max(1,Math.min(99,Math.round(base-Math.max(-gap*0.3,0)-3)));return Math.round(base);},[traits]);
  const getBoard=useCallback(()=>PROSPECTS.filter(p=>{const g=p.gpos||p.pos;const group=(g==="K"||g==="P"||g==="LS")?"K/P":g;return rankedGroups.has(group)||traits[p.id]&&Object.keys(traits[p.id]).length>1;}).sort((a,b)=>{const d=getGrade(b.id)-getGrade(a.id);return d!==0?d:(ratings[b.id]||1500)-(ratings[a.id]||1500);}),[rankedGroups,getGrade,ratings,traits]);

  // Build mock draft board: consensus order for all 319, user rankings override when graded
  const mockDraftBoard=useMemo(()=>{
    // Sort ALL prospects by consensus rank
    return [...PROSPECTS].sort((a,b)=>getConsensusRank(a.name)-getConsensusRank(b.name));
  },[]);

  const finishTraits=useCallback((pos)=>{setTraitReviewedGroups(prev=>new Set([...prev,pos]));const ranked=getRanked(pos);const byGrade=[...ranked].sort((a,b)=>getGrade(b.id)-getGrade(a.id));const conflicts=ranked.map((p,i)=>{const gi=byGrade.findIndex(x=>x.id===p.id);return Math.abs(i-gi)>=3?{player:p,pairRank:i+1,gradeRank:gi+1,grade:getGrade(p.id)}:null;}).filter(Boolean);if(conflicts.length){setReconcileQueue(conflicts);setReconcileIndex(0);setPhase("reconcile");}else setPhase("pick-position");},[getRanked,getGrade]);

  const SaveBar=()=>(<div style={{position:"fixed",top:0,left:0,right:0,zIndex:100,display:"flex",justifyContent:"space-between",alignItems:"center",padding:"6px 16px",background:"#fff",borderBottom:"1px solid #f0f0f0"}}><div style={{display:"flex",alignItems:"center",gap:12}}><img src="/logo.png" alt="BBL" style={{height:24,cursor:"pointer"}} onClick={()=>setPhase(rankedGroups.size>0?"pick-position":"home")}/><span style={{fontFamily:mono,fontSize:10,color:"#a3a3a3"}}>{user.email}</span></div><div style={{display:"flex",alignItems:"center",gap:8}}>{!showOnboarding&&<button onClick={()=>setShowOnboarding(true)} style={{fontFamily:sans,fontSize:10,color:"#a3a3a3",background:"none",border:"1px solid #e5e5e5",borderRadius:99,padding:"3px 8px",cursor:"pointer"}} title="How it works">?</button>}<span style={{fontFamily:mono,fontSize:10,color:saving?"#ca8a04":"#d4d4d4"}}>{saving?"saving...":lastSaved?`saved ${new Date(lastSaved).toLocaleTimeString()}`:""}</span><button onClick={onSignOut} style={{fontFamily:sans,fontSize:10,color:"#a3a3a3",background:"none",border:"1px solid #e5e5e5",borderRadius:99,padding:"3px 10px",cursor:"pointer"}}>sign out</button></div></div>);

  if(phase==="loading")return(<div style={{minHeight:"100vh",background:"#faf9f6",display:"flex",alignItems:"center",justifyContent:"center"}}><p style={{fontFamily:sans,fontSize:14,color:"#a3a3a3"}}>loading your board...</p></div>);

  // === MOCK DRAFT (check before phase returns to fix click bug) ===
  if(showMockDraft){const myBoard=[...PROSPECTS].sort((a,b)=>{const gA=(a.gpos==="K"||a.gpos==="P"||a.gpos==="LS")?"K/P":(a.gpos||a.pos);const gB=(b.gpos==="K"||b.gpos==="P"||b.gpos==="LS")?"K/P":(b.gpos||b.pos);const aRanked=rankedGroups.has(gA);const bRanked=rankedGroups.has(gB);if(aRanked&&!bRanked)return-1;if(!aRanked&&bRanked)return 1;if(aRanked&&bRanked){const d=getGrade(b.id)-getGrade(a.id);return d!==0?d:(ratings[b.id]||1500)-(ratings[a.id]||1500);}return getConsensusRank(a.name)-getConsensusRank(b.name);});return<MockDraftSim board={mockDraftBoard} myBoard={myBoard} getGrade={getGrade} teamNeeds={TEAM_NEEDS} draftOrder={DRAFT_ORDER} onClose={()=>{setShowMockDraft(false);setMockLaunchTeam(null);}} allProspects={PROSPECTS} PROSPECTS={PROSPECTS} CONSENSUS={CONSENSUS} ratings={ratings} traits={traits} setTraits={setTraits} notes={notes} setNotes={setNotes} POS_COLORS={POS_COLORS} POSITION_TRAITS={POSITION_TRAITS} SchoolLogo={SchoolLogo} NFLTeamLogo={NFLTeamLogo} RadarChart={RadarChart} PlayerProfile={PlayerProfile} font={font} mono={mono} sans={sans} schoolLogo={schoolLogo} getConsensusRank={getConsensusRank} getConsensusGrade={getConsensusGrade} TEAM_NEEDS_DETAILED={TEAM_NEEDS_DETAILED} rankedGroups={rankedGroups} mockLaunchTeam={mockLaunchTeam} mockLaunchRounds={mockRounds} mockLaunchSpeed={mockSpeed} mockLaunchCpuTrades={mockCpuTrades} mockLaunchBoardMode={mockBoardMode} onRankPosition={(pos)=>{setShowMockDraft(false);setMockLaunchTeam(null);startRanking(pos);}}/>;}
  // === HOME ===
  if(phase==="home"||phase==="pick-position"){
    const hasBoardData=rankedGroups.size>0||Object.keys(partialProgress).length>0;
    const hasStaleData=!hasBoardData&&Object.keys(ratings).length>0&&!sessionStorage.getItem('bbl_stale_dismissed');
    const dismissStale=()=>{sessionStorage.setItem('bbl_stale_dismissed','1');setRatings({});setTraits({});setCompCount({});setWinCount({});};
    const dismissOnboarding=()=>{setShowOnboarding(false);try{localStorage.setItem('bbl_onboarded','1');}catch(e){}};

    // Consensus big board — all prospects sorted by consensus rank
    const consensusBoard=PROSPECTS.filter(p=>{const cr=getConsensusRank(p.name);return cr&&cr<999;}).sort((a,b)=>getConsensusRank(a.name)-getConsensusRank(b.name));
    // User big board
    const userBoard=getBoard();

    // Board toggle state
    const showBoard=boardTab==="my"?userBoard:consensusBoard;
    const filteredBoard=boardFilter.size>0?showBoard.filter(p=>{const g=(p.gpos||p.pos)==="K"||(p.gpos||p.pos)==="P"||(p.gpos||p.pos)==="LS"?"K/P":(p.gpos||p.pos);return boardFilter.has(g);}):showBoard;

    return(<div style={{minHeight:"100vh",background:"#faf9f6",fontFamily:font}}><SaveBar/><div style={{maxWidth:720,margin:"0 auto",padding:"52px 24px 60px"}}>

    {/* First-visit banner — differentiators, not flow */}
    {showOnboarding&&<div style={{background:"linear-gradient(135deg,#ec4899,#7c3aed)",borderRadius:13,padding:2,marginBottom:20}}>
      <div style={{background:"#fff",borderRadius:11,padding:"14px 20px",display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:12}}>
        <div style={{fontFamily:sans,fontSize:13,color:"#525252",margin:0,lineHeight:1.7}}>
          <span style={{fontWeight:700,color:"#171717"}}>welcome to BBL</span><br/>
          <span>⚖️ rank & grade 450+ prospects by pair rankings and sliding trait scores</span><br/>
          <span>🏈 mock draft against AI GMs with real team tendencies and trade logic</span><br/>
          <span>📊 view depth chart updates post-draft and share your results</span>
        </div>
        <button onClick={dismissOnboarding} style={{fontFamily:sans,fontSize:14,color:"#a3a3a3",background:"none",border:"none",cursor:"pointer",flexShrink:0,padding:"4px",marginTop:-2}}>✕</button>
      </div>
    </div>}

    {/* Header */}
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginBottom:16}}>
      <div>
        <h1 style={{fontSize:"clamp(28px,6vw,40px)",fontWeight:900,color:"#171717",margin:"0 0 2px",letterSpacing:-1.5}}>big board lab</h1>
        <p style={{fontFamily:mono,fontSize:10,letterSpacing:2,color:"#a3a3a3",textTransform:"uppercase",margin:0}}>2026 NFL Draft · Pittsburgh · April 23–25</p>
      </div>
    </div>

    {/* Stale data warning */}
    {hasStaleData&&<div style={{background:"#fef3c7",border:"1px solid #fcd34d",borderRadius:12,padding:"12px 16px",marginBottom:16,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
      <span style={{fontFamily:sans,fontSize:13,color:"#92400e"}}>You have rankings from an old session. Reset to start fresh.</span>
      <button onClick={dismissStale} style={{fontFamily:sans,fontSize:11,fontWeight:700,padding:"6px 14px",background:"#171717",color:"#faf9f6",border:"none",borderRadius:99,cursor:"pointer",flexShrink:0,marginLeft:12}}>reset</button>
    </div>}

    {/* Mock Draft Launcher — primary CTA for new and returning users */}
    {(()=>{
      const topTeams=["Raiders","Jets","Cardinals","Titans","Giants","Browns","Commanders","Saints","Chiefs","Bengals","Dolphins","Cowboys","Rams","Ravens","Buccaneers","Lions","Vikings","Panthers","Steelers","Chargers","Eagles","Bears","Bills","49ers","Texans","Broncos","Patriots","Seahawks"];
      const launchMock=()=>{
        setShowMockDraft(true);
        setMockLaunchTeam(mockTeamSet);
        trackEvent(user.id,'mock_draft_cta_click',{teams:[...mockTeamSet].join(','),rounds:mockRounds,speed:mockSpeed});
      };
      return <div style={{background:"linear-gradient(135deg,#0f172a,#1e293b)",borderRadius:16,overflow:"hidden",marginBottom:24,position:"relative"}}>
        <div style={{position:"absolute",top:0,left:0,right:0,height:3,background:"linear-gradient(90deg,#ec4899,#7c3aed)"}}/>
        <div style={{padding:"24px 24px 20px"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16}}>
            <div>
              <div style={{fontFamily:mono,fontSize:9,letterSpacing:2,color:"#64748b",textTransform:"uppercase",marginBottom:4}}>mock draft simulator</div>
              <h2 style={{fontFamily:font,fontSize:22,fontWeight:900,color:"#f8fafc",margin:0,lineHeight:1.1}}>run your war room</h2>
              <p style={{fontFamily:sans,fontSize:12,color:"#94a3b8",margin:"6px 0 0",lineHeight:1.4}}>32 AI GMs with real personalities. Live trades. Depth charts. Every pick graded.</p>
            </div>
            <span style={{fontSize:28,flexShrink:0,marginTop:4}}>🏈</span>
          </div>

          {/* Team picker — always visible, multi-select */}
          <div style={{marginBottom:mockTeamSet.size>0?16:0}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
              <div style={{fontFamily:mono,fontSize:9,letterSpacing:1.5,color:"#64748b",textTransform:"uppercase"}}>{mockTeamSet.size>0?"your team"+(mockTeamSet.size>1?"s":""):"pick your team"}</div>
              <div style={{display:"flex",gap:4}}>
                <button onClick={()=>{setMockTeamSet(new Set(topTeams));setMockTeamPicker(topTeams[0]);}} style={{fontFamily:sans,fontSize:9,padding:"3px 8px",background:"transparent",border:"1px solid rgba(255,255,255,0.1)",borderRadius:99,cursor:"pointer",color:"#64748b"}}>select all</button>
                <button onClick={()=>{setMockTeamSet(new Set());setMockTeamPicker("");}} style={{fontFamily:sans,fontSize:9,padding:"3px 8px",background:"transparent",border:"1px solid rgba(255,255,255,0.1)",borderRadius:99,cursor:"pointer",color:"#64748b"}}>clear</button>
              </div>
            </div>
            <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
              {topTeams.sort().map(t=>{const sel=mockTeamSet.has(t);return<button key={t} onClick={()=>{const ns=new Set(mockTeamSet);if(ns.has(t))ns.delete(t);else ns.add(t);setMockTeamSet(ns);setMockTeamPicker(ns.size>0?[...ns][0]:"");}} style={{fontFamily:sans,fontSize:10,fontWeight:sel?700:600,padding:"5px 10px",background:sel?"rgba(236,72,153,0.2)":"rgba(255,255,255,0.06)",color:sel?"#f9a8d4":"#cbd5e1",border:sel?"1px solid rgba(236,72,153,0.4)":"1px solid rgba(255,255,255,0.08)",borderRadius:8,cursor:"pointer",display:"inline-flex",alignItems:"center",gap:5,transition:"all 0.15s"}} onMouseEnter={e=>{if(!sel){e.currentTarget.style.background="rgba(255,255,255,0.12)";e.currentTarget.style.color="#f1f5f9";}}} onMouseLeave={e=>{if(!sel){e.currentTarget.style.background="rgba(255,255,255,0.06)";e.currentTarget.style.color="#cbd5e1";}}}><NFLTeamLogo team={t} size={14}/>{t}</button>;})}
            </div>
          </div>

          {/* Options accordion — appears after team selected */}
          {mockTeamSet.size>0&&<div style={{animation:"fadeIn 0.2s ease"}}>
            {/* Rounds + Speed row */}
            <div style={{display:"flex",gap:12,marginBottom:12,flexWrap:"wrap"}}>
              <div style={{flex:"1 1 180px"}}>
                <div style={{fontFamily:mono,fontSize:9,letterSpacing:1.5,color:"#64748b",textTransform:"uppercase",marginBottom:6}}>rounds</div>
                <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
                  {[1,2,3,4,5,6,7].map(r=><button key={r} onClick={()=>setMockRounds(r)} style={{fontFamily:sans,fontSize:11,fontWeight:mockRounds===r?700:400,padding:"6px 12px",background:mockRounds===r?"rgba(255,255,255,0.15)":"rgba(255,255,255,0.04)",color:mockRounds===r?"#f1f5f9":"#94a3b8",border:"1px solid rgba(255,255,255,0.08)",borderRadius:8,cursor:"pointer"}}>{r}</button>)}
                </div>
              </div>
              <div style={{flex:"1 1 180px"}}>
                <div style={{fontFamily:mono,fontSize:9,letterSpacing:1.5,color:"#64748b",textTransform:"uppercase",marginBottom:6}}>speed</div>
                <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
                  {[["slow",1200],["med",600],["fast",200],["instant",50]].map(([label,ms])=><button key={label} onClick={()=>setMockSpeed(ms)} style={{fontFamily:sans,fontSize:11,fontWeight:mockSpeed===ms?700:400,padding:"6px 12px",background:mockSpeed===ms?"rgba(255,255,255,0.15)":"rgba(255,255,255,0.04)",color:mockSpeed===ms?"#f1f5f9":"#94a3b8",border:"1px solid rgba(255,255,255,0.08)",borderRadius:8,cursor:"pointer"}}>{label}</button>)}
                </div>
              </div>
            </div>

            {/* CPU Trades + Board Mode row */}
            <div style={{display:"flex",gap:12,marginBottom:16,flexWrap:"wrap"}}>
              <div style={{flex:"1 1 180px",display:"flex",alignItems:"center",justifyContent:"space-between",padding:"8px 12px",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:8}}>
                <div>
                  <div style={{fontFamily:mono,fontSize:9,letterSpacing:1.5,color:"#64748b",textTransform:"uppercase"}}>cpu trades</div>
                  <div style={{fontFamily:sans,fontSize:10,color:"#64748b",marginTop:2}}>AI teams trade up for elite players</div>
                </div>
                <button onClick={()=>setMockCpuTrades(prev=>!prev)} style={{width:40,height:22,borderRadius:11,border:"none",background:mockCpuTrades?"linear-gradient(135deg,#a855f7,#ec4899)":"#475569",cursor:"pointer",position:"relative",transition:"background 0.2s",flexShrink:0}}><div style={{width:16,height:16,borderRadius:8,background:"#fff",position:"absolute",top:3,left:mockCpuTrades?21:3,transition:"left 0.2s",boxShadow:"0 1px 3px rgba(0,0,0,0.3)"}}/></button>
              </div>
              <div style={{flex:"1 1 180px"}}>
                <div style={{fontFamily:mono,fontSize:9,letterSpacing:1.5,color:"#64748b",textTransform:"uppercase",marginBottom:6}}>draft board</div>
                <div style={{display:"flex",gap:4}}>
                  {[["consensus","Consensus"],["my","My Board"]].map(([mode,label])=><button key={mode} onClick={()=>setMockBoardMode(mode)} style={{flex:1,fontFamily:sans,fontSize:11,fontWeight:mockBoardMode===mode?700:400,padding:"6px 12px",background:mockBoardMode===mode?"rgba(255,255,255,0.15)":"rgba(255,255,255,0.04)",color:mockBoardMode===mode?"#f1f5f9":"#94a3b8",border:"1px solid rgba(255,255,255,0.08)",borderRadius:8,cursor:"pointer"}}>{label}</button>)}
                </div>
              </div>
            </div>

            <button onClick={launchMock} style={{width:"100%",fontFamily:sans,fontSize:14,fontWeight:700,padding:"12px 20px",background:"linear-gradient(135deg,#ec4899,#7c3aed)",color:"#fff",border:"none",borderRadius:99,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
              {mockTeamSet.size===1?<><NFLTeamLogo team={[...mockTeamSet][0]} size={18}/> draft as {[...mockTeamSet][0]} →</>:
               mockTeamSet.size>1?<>start draft ({mockTeamSet.size} teams) →</>:null}
            </button>
          </div>}
        </div>
      </div>;
    })()}

    {/* Big Board Module */}
    <div style={{background:"#fff",border:"1px solid #e5e5e5",borderRadius:16,overflow:"hidden",marginBottom:24}}>
      {/* Toggle tabs */}
      <div style={{display:"flex",borderBottom:"1px solid #f0f0f0"}}>
        <button onClick={()=>setBoardTab("consensus")} style={{flex:1,fontFamily:sans,fontSize:13,fontWeight:boardTab==="consensus"?700:500,padding:"14px 16px",background:"transparent",border:"none",borderBottom:boardTab==="consensus"?"2px solid #171717":"2px solid transparent",color:boardTab==="consensus"?"#171717":"#a3a3a3",cursor:"pointer"}}>consensus big board</button>
        <button onClick={()=>setBoardTab("my")} style={{flex:1,fontFamily:sans,fontSize:13,fontWeight:boardTab==="my"?700:500,padding:"14px 16px",background:"transparent",border:"none",borderBottom:boardTab==="my"?"2px solid #171717":"2px solid transparent",color:boardTab==="my"?"#171717":"#a3a3a3",cursor:"pointer"}}>my big board{rankedGroups.size>0&&<span style={{fontFamily:mono,fontSize:10,color:"#22c55e",marginLeft:6}}>{rankedGroups.size}/{POSITION_GROUPS.length}</span>}</button>
      </div>

      {/* Position filter pills */}
      <div style={{padding:"10px 16px 6px",display:"flex",gap:5,flexWrap:"wrap"}}>
        <button onClick={()=>setBoardFilter(new Set())} style={{fontFamily:mono,fontSize:10,padding:"3px 10px",background:boardFilter.size===0?"#171717":"transparent",color:boardFilter.size===0?"#faf9f6":"#a3a3a3",border:"1px solid "+(boardFilter.size===0?"#171717":"#e5e5e5"),borderRadius:99,cursor:"pointer"}}>all</button>
        {POSITION_GROUPS.map(pos=>{const active=boardFilter.has(pos);const c=POS_COLORS[pos];return<button key={pos} onClick={()=>setBoardFilter(prev=>{const n=new Set(prev);if(n.has(pos))n.delete(pos);else n.add(pos);return n;})} style={{fontFamily:mono,fontSize:10,padding:"3px 10px",background:active?`${c}11`:"transparent",color:active?c:"#a3a3a3",border:`1px solid ${active?c+"33":"#e5e5e5"}`,borderRadius:99,cursor:"pointer"}}>{pos}</button>;})}
      </div>

      {/* Board content */}
      {boardTab==="my"&&userBoard.length===0?(
        /* My Big Board empty state — inline CTA */
        <div style={{padding:"40px 24px",textAlign:"center"}}>
          <div style={{fontSize:40,marginBottom:12}}>⚖️</div>
          <h3 style={{fontFamily:font,fontSize:20,fontWeight:900,color:"#171717",margin:"0 0 8px"}}>build your board</h3>
          <p style={{fontFamily:sans,fontSize:14,color:"#737373",margin:"0 0 6px",maxWidth:380,marginLeft:"auto",marginRight:"auto",lineHeight:1.5}}>
            pick A or B in head-to-head matchups to rank prospects your way. start with QBs — it only takes a few minutes.
          </p>
          {rankedGroups.size>0&&<p style={{fontFamily:mono,fontSize:11,color:"#22c55e",margin:"0 0 16px"}}>{rankedGroups.size} position{rankedGroups.size!==1?"s":""} ranked so far</p>}
          <button onClick={()=>startRanking("QB")} style={{fontFamily:sans,fontSize:14,fontWeight:700,padding:"12px 28px",background:"#171717",color:"#faf9f6",border:"none",borderRadius:99,cursor:"pointer"}}>rank QBs →</button>
          <p style={{fontFamily:sans,fontSize:11,color:"#a3a3a3",margin:"12px 0 0"}}>or pick any position below</p>
        </div>
      ):(
        /* Board list */
        <div style={{maxHeight:480,overflowY:"auto"}}>
          {filteredBoard.slice(0,100).map((p,i)=>{
            const grade=boardTab==="my"?getGrade(p.id):getConsensusGrade(p.name);
            const c=POS_COLORS[p.gpos||p.pos]||POS_COLORS[p.pos]||"#525252";
            const rank=boardTab==="consensus"?getConsensusRank(p.name):i+1;
            return<div key={p.id} style={{display:"flex",alignItems:"center",padding:"8px 16px",borderBottom:"1px solid #f8f8f6",cursor:"pointer"}} onClick={()=>setProfilePlayer(p)} onMouseEnter={e=>e.currentTarget.style.background="#faf9f6"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
              <div style={{width:80,flexShrink:0,display:"flex",alignItems:"center",gap:8}}>
                <span style={{fontFamily:mono,fontSize:11,color:"#d4d4d4",width:22,textAlign:"right",flexShrink:0}}>{rank}</span>
                <span style={{fontFamily:mono,fontSize:9,fontWeight:600,color:c,background:`${c}0d`,padding:"2px 7px",borderRadius:4}}>{p.gpos||p.pos}</span>
              </div>
              <SchoolLogo school={p.school} size={20}/>
              <div style={{flex:1,minWidth:0,marginLeft:10}}>
                <span style={{fontFamily:sans,fontSize:13,fontWeight:700,color:"#171717"}}>{p.name}</span>
                <span style={{fontFamily:mono,fontSize:10,color:"#a3a3a3",marginLeft:6}}>{p.school}</span>
              </div>
              {grade&&<span style={{fontFamily:font,fontSize:14,fontWeight:900,color:grade>=75?"#16a34a":grade>=55?"#ca8a04":"#dc2626",flexShrink:0}}>{grade}</span>}
            </div>;
          })}
          {filteredBoard.length>100&&<div style={{padding:"12px 16px",textAlign:"center"}}><span style={{fontFamily:mono,fontSize:10,color:"#a3a3a3"}}>showing top 100 of {filteredBoard.length}</span></div>}
        </div>
      )}

      {/* Board footer */}
      {boardTab==="my"&&userBoard.length>0&&(()=>{
        const nextPos=POSITION_GROUPS.find(pos=>!rankedGroups.has(pos)&&!partialProgress[pos]);
        const contPos=POSITION_GROUPS.find(pos=>!rankedGroups.has(pos)&&partialProgress[pos]);
        return<div style={{padding:"10px 16px",borderTop:"1px solid #f0f0f0",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <span style={{fontFamily:mono,fontSize:10,color:"#a3a3a3"}}>{rankedGroups.size}/{POSITION_GROUPS.length} positions · {userBoard.length} prospects</span>
          <div style={{display:"flex",gap:8}}>
            {rankedGroups.size>=POSITION_GROUPS.length?
              <button onClick={()=>setPhase("board")} style={{fontFamily:sans,fontSize:11,fontWeight:700,color:"#171717",background:"none",border:"1px solid #e5e5e5",borderRadius:99,padding:"5px 14px",cursor:"pointer"}}>full board view →</button>
            :contPos?
              <button onClick={()=>startRanking(contPos,true)} style={{fontFamily:sans,fontSize:11,fontWeight:700,color:"#faf9f6",background:"#171717",border:"none",borderRadius:99,padding:"5px 14px",cursor:"pointer"}}>continue {contPos}s →</button>
            :nextPos?
              <button onClick={()=>startRanking(nextPos)} style={{fontFamily:sans,fontSize:11,fontWeight:700,color:"#faf9f6",background:"#171717",border:"none",borderRadius:99,padding:"5px 14px",cursor:"pointer"}}>rank {nextPos}s →</button>
            :null}
          </div>
        </div>;
      })()}
      {boardTab==="consensus"&&<div style={{padding:"10px 16px",borderTop:"1px solid #f0f0f0",display:"flex",justifyContent:"center",alignItems:"center"}}>
        <span style={{fontFamily:sans,fontSize:11,color:"#a3a3a3"}}>disagree? <button onClick={()=>setBoardTab("my")} style={{fontFamily:sans,fontSize:11,fontWeight:700,color:"#171717",background:"none",border:"none",cursor:"pointer",textDecoration:"underline",padding:0}}>build your own rankings</button></span>
      </div>}
    </div>

    {/* Position Grid */}
    <h2 style={{fontFamily:font,fontSize:18,fontWeight:900,color:"#171717",margin:"0 0 4px",letterSpacing:-0.5}}>{hasBoardData?"edit positions":"rank by position"}</h2>
    <p style={{fontFamily:sans,fontSize:13,color:"#a3a3a3",margin:"0 0 14px"}}>rank each group to build your board</p>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill, minmax(200px, 1fr))",gap:12}}>{POSITION_GROUPS.map(pos=>{const ct=(byPos[pos]||[]).length;const done=rankedGroups.has(pos);const partial=!!partialProgress[pos];const reviewed=traitReviewedGroups.has(pos);const c=POS_COLORS[pos];
      const completedCount=partial?(partialProgress[pos].completed?.size||0):0;
      const totalMatchups=partial?(partialProgress[pos].matchups?.length||0):0;
      return(<div key={pos} style={{background:"#fff",border:"1px solid #e5e5e5",borderRadius:12,padding:"18px 20px",position:"relative"}}>
        {done&&<span style={{position:"absolute",top:12,right:14,fontSize:10,fontFamily:mono,color:"#22c55e"}}>✓ ranked</span>}
        {partial&&!done&&<span style={{position:"absolute",top:12,right:14,fontSize:10,fontFamily:mono,color:"#ca8a04"}}>{completedCount}/{totalMatchups}</span>}
        <div style={{fontFamily:font,fontSize:28,fontWeight:900,color:c,marginBottom:2}}>{pos}</div>
        <div style={{fontFamily:mono,fontSize:11,color:"#a3a3a3",marginBottom:14}}>{ct} prospects</div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          {!done&&!partial&&<button onClick={()=>startRanking(pos)} style={{fontFamily:sans,fontSize:12,fontWeight:700,padding:"7px 18px",background:"#171717",color:"#faf9f6",border:"none",borderRadius:99,cursor:"pointer"}}>{POS_EMOJI[pos]||""} rank</button>}
          {partial&&!done&&<>
            <button onClick={()=>{setActivePos(pos);setSelectedPlayer(getRanked(pos)[0]);setPhase("traits");}} style={{fontFamily:sans,fontSize:12,fontWeight:700,padding:"7px 18px",background:`${c}11`,color:c,border:`1px solid ${c}33`,borderRadius:99,cursor:"pointer"}}>✓ rankings</button>
            <button onClick={()=>startRanking(pos,true)} style={{fontFamily:sans,fontSize:11,padding:"7px 14px",background:"#171717",color:"#faf9f6",border:"none",borderRadius:99,cursor:"pointer"}}>continue</button>
          </>}
          {done&&<>
            <button onClick={()=>{setActivePos(pos);setSelectedPlayer(getRanked(pos)[0]);setPhase("traits");}} style={{fontFamily:sans,fontSize:12,fontWeight:700,padding:"7px 18px",background:reviewed?`${c}11`:"#171717",color:reviewed?c:"#faf9f6",border:reviewed?`1px solid ${c}33`:"none",borderRadius:99,cursor:"pointer"}}>{reviewed?"✓ rankings":"rankings"}</button>
          </>}
        </div>
      </div>);})}</div>
    {rankedGroups.size>0&&<div style={{textAlign:"center",marginTop:32}}><button onClick={()=>setPhase("board")} style={{fontFamily:sans,fontSize:14,fontWeight:700,padding:"14px 36px",background:"#171717",color:"#faf9f6",border:"none",borderRadius:99,cursor:"pointer"}}>view big board ({rankedGroups.size}/{POSITION_GROUPS.length})</button></div>}

    </div></div>);
  }

  // === RANKING ===
  if(phase==="ranking"&&currentMatchup&&activePos){const[aId,bId]=currentMatchup;const pA=prospectsMap[aId],pB=prospectsMap[bId];const c=POS_COLORS[activePos];const totalM=(matchups[activePos]||[]).length;const doneM=(completed[activePos]||new Set()).size;const ranked=getRanked(activePos);return(<div style={{minHeight:"100vh",background:"#faf9f6",fontFamily:font}}><SaveBar/><div style={{maxWidth:720,margin:"0 auto",padding:"52px 24px 40px"}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}><h1 style={{fontSize:28,fontWeight:900,color:c,margin:0}}>rank {activePos}s</h1><div style={{display:"flex",gap:6}}>
    {canFinish&&<button onClick={()=>finishRanking(activePos,ratings)} style={{fontFamily:sans,fontSize:12,fontWeight:700,padding:"8px 20px",background:"#22c55e",color:"#fff",border:"none",borderRadius:99,cursor:"pointer"}}>✓ done</button>}
    {canSim&&<button onClick={()=>simAndFinish(activePos)} style={{fontFamily:sans,fontSize:11,padding:"8px 16px",background:"linear-gradient(135deg,#ec4899,#7c3aed)",color:"#fff",border:"none",borderRadius:99,cursor:"pointer"}}>sim rest ⚡</button>}
    <button onClick={()=>{setLockedPlayer(null);const done=completed[activePos]||new Set();if(done.size>0){setPartialProgress(prev=>({...prev,[activePos]:{matchups:matchups[activePos]||[],completed:done,ratings}}));}setPhase("pick-position");}} style={{fontFamily:sans,fontSize:11,padding:"8px 14px",background:"transparent",color:"#a3a3a3",border:"1px solid #e5e5e5",borderRadius:99,cursor:"pointer"}}>save & exit</button>
  </div></div><p style={{fontFamily:sans,fontSize:13,color:"#a3a3a3",margin:"0 0 8px"}}>who's the better prospect?</p>{(()=>{
  const simThreshold=20;
  const simPct=30; // sim marker sits at 30% of bar visually
  const rawPct=doneM/totalM;
  // Compress: 0-simThreshold maps to 0-simPct%, simThreshold-totalM maps to simPct-100%
  const visualPct=doneM<=simThreshold?(doneM/simThreshold)*simPct:simPct+((doneM-simThreshold)/(totalM-simThreshold))*(100-simPct);
  const pastSim=doneM>=simThreshold;
  return<div style={{marginBottom:28}}>
    <div style={{position:"relative",height:6,background:"#e5e5e5",borderRadius:3}}>
      {/* Fill bar */}
      <div style={{position:"absolute",left:0,top:0,height:"100%",width:`${Math.min(visualPct,100)}%`,background:pastSim?`linear-gradient(90deg,${c},#22c55e)`:c,borderRadius:3,transition:"width 0.3s"}}/>
      {/* Sim threshold marker */}
      <div style={{position:"absolute",left:`${simPct}%`,top:-4,width:2,height:14,background:pastSim?"#22c55e":"#a3a3a3",borderRadius:1}}/>
    </div>
    <div style={{display:"flex",justifyContent:"space-between",marginTop:6}}>
      <div style={{position:"relative",left:`${simPct}%`,transform:"translateX(-50%)"}}>
        <span style={{fontFamily:mono,fontSize:9,color:pastSim?"#22c55e":"#a3a3a3"}}>{pastSim?"✓ ":""}sim & save{!pastSim?` (${simThreshold-doneM} left)`:""}</span>
      </div>
      <span style={{fontFamily:mono,fontSize:9,color:"#d4d4d4"}}>{doneM}/{totalM}</span>
    </div>
  </div>;
})()}<div style={{display:"flex",gap:12,marginBottom:24,alignItems:"stretch",position:"relative"}}><div style={{position:"absolute",left:"50%",top:"50%",transform:"translate(-50%,-50%)",zIndex:2,fontFamily:font,fontSize:16,fontWeight:900,color:"#d4d4d4",background:"#faf9f6",padding:"4px 10px",borderRadius:99,border:"1px solid #e5e5e5"}}>vs</div>{[{p:pA,id:aId},{p:pB,id:bId}].map(({p,id})=>{const ps=getProspectStats(p.name,p.school);return<button key={id} onClick={()=>{if(showConfidence)return;setPendingWinner(id);setShowConfidence(true);}} style={{flex:1,padding:"24px 16px 20px",background:pendingWinner===id?`${c}08`:"#fff",border:pendingWinner===id?`2px solid ${c}`:"1px solid #e5e5e5",borderRadius:16,cursor:showConfidence?"default":"pointer",textAlign:"center",transition:"all 0.15s",display:"flex",flexDirection:"column",alignItems:"center",gap:4}} onMouseEnter={e=>{if(!showConfidence)e.currentTarget.style.borderColor=c;}} onMouseLeave={e=>{if(!showConfidence&&pendingWinner!==id)e.currentTarget.style.borderColor="#e5e5e5";}}><SchoolLogo school={p.school} size={44}/><div style={{fontFamily:font,fontSize:20,fontWeight:900,color:"#171717",lineHeight:1.1,marginTop:2}}>{p.name}</div><div style={{fontFamily:mono,fontSize:11,color:"#a3a3a3"}}>{p.school}</div><div style={{display:"flex",gap:6,alignItems:"center",marginTop:2}}><span style={{fontFamily:mono,fontSize:10,fontWeight:500,color:c,background:`${c}0d`,padding:"3px 10px",borderRadius:4,border:`1px solid ${c}1a`}}>{p.gpos||p.pos}</span>{ps&&<span style={{fontFamily:mono,fontSize:10,color:"#a3a3a3"}}>{ps.rank?"#"+ps.rank+" ovr":"NR"}{ps.posRank?" · "+(p.gpos||p.pos)+ps.posRank:""}</span>}</div>{ps&&(ps.height||ps.weight)&&<div style={{fontFamily:mono,fontSize:10,color:"#a3a3a3",marginTop:2}}>{[ps.height,ps.weight?ps.weight+"lbs":"",ps.cls?("yr "+ps.cls):""].filter(Boolean).join(" · ")}</div>}{ps&&ps.statLine&&<div style={{fontFamily:mono,fontSize:10,color:"#525252",marginTop:4,lineHeight:1.3,background:"#f9f9f6",padding:"4px 8px",borderRadius:6,border:"1px solid #f0f0f0",maxWidth:"100%"}}>{ps.statLine}{ps.statExtra&&<><br/><span style={{color:"#a3a3a3"}}>{ps.statExtra}</span></>}</div>}{(compCount[id]||0)>=2&&<div style={{fontFamily:mono,fontSize:9,color:"#a3a3a3",marginTop:4}}>{Math.round(((winCount[id]||0)/(compCount[id]))*100)}% pick rate</div>}</button>})}</div>{showConfidence&&<div style={{background:"#fff",border:"1px solid #e5e5e5",borderRadius:12,padding:"20px 24px",marginBottom:24,textAlign:"center"}}><p style={{fontFamily:sans,fontSize:13,fontWeight:700,color:"#171717",margin:"0 0 4px"}}>how confident?</p><p style={{fontFamily:sans,fontSize:12,color:"#a3a3a3",margin:"0 0 16px"}}>higher = bigger rating swing</p><div style={{display:"flex",gap:8,justifyContent:"center",flexWrap:"wrap"}}>{[["coin flip",.2],["leaning",.5],["confident",.75],["lock",1]].map(([label,val])=><button key={label} onClick={()=>handlePick(pendingWinner,val)} style={{fontFamily:sans,fontSize:12,fontWeight:600,padding:"8px 16px",background:val>=.75?"#171717":"transparent",color:val>=.75?"#faf9f6":"#525252",border:"1px solid #e5e5e5",borderRadius:99,cursor:"pointer"}} onMouseEnter={e=>{e.currentTarget.style.background="#171717";e.currentTarget.style.color="#faf9f6";}} onMouseLeave={e=>{if(val<.75){e.currentTarget.style.background="transparent";e.currentTarget.style.color="#525252";}}}>{label}</button>)}</div><button onClick={()=>{setShowConfidence(false);setPendingWinner(null);}} style={{fontFamily:sans,fontSize:11,color:"#a3a3a3",background:"none",border:"none",cursor:"pointer",marginTop:10}}>← pick again</button></div>}<div style={{background:"#fff",border:"1px solid #e5e5e5",borderRadius:12,padding:"16px 20px",marginBottom:16}}>{lockedPlayer&&(()=>{const lp=prospectsMap[lockedPlayer];const remLocked=(matchups[activePos]||[]).filter(m=>!((completed[activePos]||new Set()).has(`${m[0]}-${m[1]}`))&&(m[0]===lockedPlayer||m[1]===lockedPlayer));return<div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"8px 12px",marginBottom:12,background:"linear-gradient(135deg,#fef3c7,#fef9c3)",border:"1px solid #fbbf24",borderRadius:8}}><div style={{display:"flex",alignItems:"center",gap:8}}><span style={{fontSize:14}}>🎯</span><span style={{fontFamily:sans,fontSize:12,fontWeight:700,color:"#92400e"}}>{lp?.name} focus mode</span><span style={{fontFamily:mono,fontSize:10,color:"#b45309"}}>{remLocked.length} left</span></div><button onClick={()=>{setLockedPlayer(null);const ns=completed[activePos]||new Set();const next=getNextMatchup(matchups[activePos],ns,ratings,compCount,posRankFn,null);if(next)setCurrentMatchup(next);}} style={{fontFamily:sans,fontSize:10,fontWeight:600,padding:"4px 10px",background:"#fff",color:"#92400e",border:"1px solid #fbbf24",borderRadius:99,cursor:"pointer"}}>unlock</button></div>;})()}<p style={{fontFamily:mono,fontSize:10,letterSpacing:2,color:"#a3a3a3",textTransform:"uppercase",margin:"0 0 10px"}}>live rankings</p><div style={{maxHeight:400,overflowY:"auto"}}>{ranked.map((p,i)=>{const isLocked=lockedPlayer===p.id;return<div key={p.id} className="rank-row" style={{display:"flex",alignItems:"center",gap:10,padding:"5px 0",borderBottom:i<ranked.length-1?"1px solid #f5f5f5":"none",background:isLocked?"#fef9c3":"transparent",borderRadius:isLocked?4:0,margin:isLocked?"0 -4px":"0",padding:isLocked?"5px 4px":"5px 0"}}><span style={{fontFamily:mono,fontSize:11,color:"#d4d4d4",width:20,textAlign:"right"}}>{i+1}</span><SchoolLogo school={p.school} size={20}/><span style={{fontFamily:sans,fontSize:13,fontWeight:600,color:"#171717",flex:1,cursor:"pointer",textDecoration:"none"}} onClick={e=>{e.stopPropagation();setProfilePlayer(p);}} onMouseEnter={e=>e.currentTarget.style.textDecoration="underline"} onMouseLeave={e=>e.currentTarget.style.textDecoration="none"}>{p.name}</span><span style={{fontFamily:mono,fontSize:11,color:"#a3a3a3"}}>{Math.round(ratings[p.id]||1500)}</span><button onClick={e=>{e.stopPropagation();if(isLocked){setLockedPlayer(null);const ns=completed[activePos]||new Set();const next=getNextMatchup(matchups[activePos],ns,ratings,compCount,posRankFn,null);if(next)setCurrentMatchup(next);}else{setLockedPlayer(p.id);const ns=completed[activePos]||new Set();const next=getNextMatchup(matchups[activePos],ns,ratings,compCount,posRankFn,p.id);if(next)setCurrentMatchup(next);else setLockedPlayer(null);}}} title={isLocked?"Unlock":"Focus matchups on this player"} style={{fontSize:12,background:"none",border:"none",cursor:"pointer",padding:"2px 4px",opacity:isLocked?1:0,transition:"opacity 0.15s",flexShrink:0}} className="lock-btn">{isLocked?"🎯":"📌"}</button></div>;})}</div><style>{`.rank-row:hover .lock-btn{opacity:1!important;}@media(max-width:768px){.lock-btn{display:none!important;}}`}</style></div><button onClick={()=>{setLockedPlayer(null);const done=completed[activePos]||new Set();if(done.size>0){setPartialProgress(prev=>({...prev,[activePos]:{matchups:matchups[activePos]||[],completed:done,ratings}}));}setPhase("pick-position");}} style={{fontFamily:sans,fontSize:12,color:"#a3a3a3",background:"none",border:"1px solid #e5e5e5",borderRadius:99,padding:"8px 20px",cursor:"pointer"}}>← save & exit</button></div>{profilePlayer&&<PlayerProfile player={profilePlayer} traits={traits} setTraits={setTraits} notes={notes} setNotes={setNotes} allProspects={PROSPECTS} getGrade={getGrade} onClose={()=>setProfilePlayer(null)} onSelectPlayer={setProfilePlayer} consensus={CONSENSUS} ratings={ratings}/>}</div>);}

  // === TRAITS ===
  if(phase==="traits"&&activePos){const ranked=getRanked(activePos);const posTraits=POSITION_TRAITS[activePos]||[];const c=POS_COLORS[activePos];const cur=selectedPlayer||ranked[0];const curIdx=ranked.findIndex(p=>p.id===cur?.id);return(<div style={{minHeight:"100vh",background:"#faf9f6",fontFamily:font}}><SaveBar/><div style={{maxWidth:900,margin:"0 auto",padding:"52px 24px 40px"}}><h1 style={{fontSize:28,fontWeight:900,color:c,margin:"0 0 4px"}}>{activePos} rankings</h1><p style={{fontFamily:sans,fontSize:13,color:"#a3a3a3",margin:"0 0 24px"}}>drag to reorder · click name for full profile</p><div style={{display:"flex",gap:16,flexWrap:"wrap"}}><DraggableRankList ranked={ranked} activePos={activePos} cur={cur} c={c} getGrade={getGrade} setSelectedPlayer={setSelectedPlayer} movePlayer={movePlayer} setProfilePlayer={setProfilePlayer} font={font} mono={mono} sans={sans}/>{cur&&<div style={{flex:"1 1 300px",minWidth:260,background:"#fff",border:"1px solid #e5e5e5",borderRadius:12,padding:24}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20,paddingBottom:16,borderBottom:"1px solid #f5f5f5"}}><div style={{display:"flex",alignItems:"center",gap:14}}><SchoolLogo school={cur.school} size={44}/><div><div style={{fontFamily:font,fontSize:24,fontWeight:900,color:"#171717",cursor:"pointer"}} onClick={()=>setProfilePlayer(cur)} onMouseEnter={e=>e.currentTarget.style.textDecoration="underline"} onMouseLeave={e=>e.currentTarget.style.textDecoration="none"}>{cur.name}</div><div style={{fontFamily:mono,fontSize:12,color:"#a3a3a3"}}>{cur.school}</div></div></div><div style={{textAlign:"right"}}><div style={{fontFamily:font,fontSize:36,fontWeight:900,color:getGrade(cur.id)>=75?"#16a34a":getGrade(cur.id)>=55?"#ca8a04":"#dc2626",lineHeight:1}}>{getGrade(cur.id)}</div><div style={{fontFamily:mono,fontSize:9,letterSpacing:2,color:"#a3a3a3",textTransform:"uppercase"}}>grade</div></div></div><div style={{display:"flex",justifyContent:"center",marginBottom:16}}><RadarChart traits={posTraits} values={posTraits.map(t=>traits[cur.id]?.[t]||50)} color={c} size={220}/></div>{(()=>{const ceil=traits[cur.id]?.__ceiling||"normal";const m={capped:{icon:"🔒",label:"Capped",color:"#737373",bg:"#f5f5f5"},normal:{icon:"📊",label:"Normal",color:"#64748b",bg:"#f0f4ff"},high:{icon:"🔥",label:"High Ceiling",color:"#b45309",bg:"#fef3c7"},elite:{icon:"⭐",label:"Elite Ceiling",color:"#7c3aed",bg:"#f3e8ff"}};const s=m[ceil]||m.normal;return ceil!=="normal"?<div style={{marginBottom:12,paddingBottom:12,borderBottom:"1px solid #f0f0f0"}}><div style={{display:"inline-flex",alignItems:"center",gap:6,padding:"4px 12px",background:s.bg,borderRadius:99}}><span style={{fontSize:13}}>{s.icon}</span><span style={{fontFamily:mono,fontSize:11,fontWeight:700,color:s.color}}>{s.label}</span></div></div>:null;})()}<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"8px 16px"}}>{posTraits.map(trait=>{const val=traits[cur.id]?.[trait]||50;return<div key={trait} style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><span style={{fontFamily:mono,fontSize:11,color:"#737373"}}>{TRAIT_EMOJI[trait]||""} {trait}</span><span style={{fontFamily:font,fontSize:14,fontWeight:900,color:`rgb(${Math.round(236+(124-236)*(val/100))},${Math.round(72+(58-72)*(val/100))},${Math.round(153+(237-153)*(val/100))})`}}>{val}</span></div>;})}</div>{notes[cur.id]&&<div style={{marginTop:16,padding:"10px 12px",background:"#faf9f6",borderRadius:8,border:"1px solid #f0f0f0"}}><div style={{fontFamily:mono,fontSize:9,color:"#a3a3a3",letterSpacing:1,textTransform:"uppercase",marginBottom:4}}>notes</div><div style={{fontFamily:sans,fontSize:12,color:"#525252",lineHeight:1.5}}>{notes[cur.id]}</div></div>}<div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:20,paddingTop:16,borderTop:"1px solid #f5f5f5"}}><button onClick={()=>curIdx>0&&setSelectedPlayer(ranked[curIdx-1])} disabled={curIdx<=0} style={{fontFamily:sans,fontSize:12,padding:"7px 16px",background:"transparent",border:"1px solid #e5e5e5",borderRadius:99,cursor:curIdx>0?"pointer":"default",color:curIdx>0?"#525252":"#d4d4d4"}}>← prev</button><span style={{fontFamily:mono,fontSize:11,color:"#a3a3a3"}}>{curIdx+1} / {ranked.length}</span><button onClick={()=>curIdx<ranked.length-1&&setSelectedPlayer(ranked[curIdx+1])} disabled={curIdx>=ranked.length-1} style={{fontFamily:sans,fontSize:12,padding:"7px 16px",background:"transparent",border:"1px solid #e5e5e5",borderRadius:99,cursor:curIdx<ranked.length-1?"pointer":"default",color:curIdx<ranked.length-1?"#525252":"#d4d4d4"}}>next →</button></div></div>}</div><div style={{display:"flex",gap:10,marginTop:20,justifyContent:"center",flexWrap:"wrap"}}>
  <button onClick={()=>setPhase("pick-position")} style={{fontFamily:sans,fontSize:12,padding:"8px 20px",background:"transparent",border:"1px solid #e5e5e5",borderRadius:99,cursor:"pointer",color:"#a3a3a3"}}>← back</button>
  <button onClick={()=>finishTraits(activePos)} style={{fontFamily:sans,fontSize:13,fontWeight:700,padding:"10px 28px",background:"#171717",color:"#faf9f6",border:"none",borderRadius:99,cursor:"pointer"}}>save rankings →</button>
  <button onClick={()=>{if(window.confirm(`Reset ${activePos} rankings? This will clear all pair comparisons and traits for this position.`)){
    // Clear ratings for this position's players
    const posIds=new Set((byPos[activePos]||[]).map(p=>p.id));
    setRatings(prev=>{const n={...prev};posIds.forEach(id=>delete n[id]);return n;});
    setTraits(prev=>{const n={...prev};posIds.forEach(id=>delete n[id]);return n;});
    setCompCount(prev=>{const n={...prev};posIds.forEach(id=>delete n[id]);return n;});
    setRankedGroups(prev=>{const n=new Set(prev);n.delete(activePos);return n;});
    setTraitReviewedGroups(prev=>{const n=new Set(prev);n.delete(activePos);return n;});
    setPartialProgress(prev=>{const n={...prev};delete n[activePos];return n;});
    setPhase("pick-position");
  }}} style={{fontFamily:sans,fontSize:11,padding:"7px 14px",background:"transparent",color:"#dc2626",border:"1px solid #fecaca",borderRadius:99,cursor:"pointer"}}>reset {activePos}</button>
</div></div>{profilePlayer&&<PlayerProfile player={profilePlayer} traits={traits} setTraits={setTraits} notes={notes} setNotes={setNotes} allProspects={PROSPECTS} getGrade={getGrade} onClose={()=>setProfilePlayer(null)} onSelectPlayer={setProfilePlayer} consensus={CONSENSUS} ratings={ratings}/>}</div>);}

  // === RECONCILE ===
  if(phase==="reconcile"&&reconcileQueue.length>0){const item=reconcileQueue[Math.min(reconcileIndex,reconcileQueue.length-1)];const c=POS_COLORS[item.player.pos];const dir=item.gradeRank<item.pairRank?"higher":"lower";return(<div style={{minHeight:"100vh",background:"#faf9f6",fontFamily:font}}><SaveBar/><div style={{maxWidth:500,margin:"0 auto",padding:"52px 24px"}}><p style={{fontFamily:mono,fontSize:10,letterSpacing:2,color:"#a3a3a3",textTransform:"uppercase",margin:"0 0 4px"}}>reconcile · {reconcileIndex+1} of {reconcileQueue.length}</p><div style={{height:3,background:"#e5e5e5",borderRadius:2,marginBottom:28,overflow:"hidden"}}><div style={{height:"100%",width:`${((reconcileIndex+1)/reconcileQueue.length)*100}%`,background:c,borderRadius:2}}/></div><div style={{background:"#fff",border:"1px solid #e5e5e5",borderRadius:16,padding:32,textAlign:"center"}}><SchoolLogo school={item.player.school} size={56}/><div style={{fontFamily:font,fontSize:28,fontWeight:900,color:c,marginBottom:4,marginTop:8}}>{item.player.name}</div><div style={{fontFamily:mono,fontSize:12,color:"#a3a3a3",marginBottom:24}}>{item.player.school}</div><div style={{display:"flex",justifyContent:"center",gap:32,marginBottom:24}}>{[["gut rank",`#${item.pairRank}`,"#171717"],["grade rank",`#${item.gradeRank}`,dir==="higher"?"#16a34a":"#dc2626"],["composite",`${item.grade}`,"#171717"]].map(([label,val,col])=><div key={label}><div style={{fontFamily:mono,fontSize:9,letterSpacing:1.5,color:"#a3a3a3",textTransform:"uppercase",marginBottom:4}}>{label}</div><div style={{fontFamily:font,fontSize:28,fontWeight:900,color:col}}>{val}</div></div>)}</div><p style={{fontFamily:sans,fontSize:14,color:"#737373",lineHeight:1.5,marginBottom:24}}>your traits suggest this player should rank <strong style={{color:dir==="higher"?"#16a34a":"#dc2626"}}>{dir}</strong> than your gut. accept?</p><div style={{display:"flex",gap:10,justifyContent:"center"}}><button onClick={()=>{const pos=item.player.pos;const rk=getRanked(pos);const ti=item.gradeRank-1;const tp=rk[ti];if(tp)setRatings(prev=>({...prev,[item.player.id]:(prev[tp.id]||1500)+(dir==="higher"?1:-1)}));reconcileIndex>=reconcileQueue.length-1?setPhase("pick-position"):setReconcileIndex(reconcileIndex+1);}} style={{fontFamily:sans,fontSize:13,fontWeight:700,padding:"10px 24px",background:"#171717",color:"#faf9f6",border:"none",borderRadius:99,cursor:"pointer"}}>accept</button><button onClick={()=>reconcileIndex>=reconcileQueue.length-1?setPhase("pick-position"):setReconcileIndex(reconcileIndex+1)} style={{fontFamily:sans,fontSize:13,padding:"10px 24px",background:"transparent",color:"#737373",border:"1px solid #e5e5e5",borderRadius:99,cursor:"pointer"}}>keep my rank</button></div></div></div></div>);}

  // === BIG BOARD ===
  if(phase==="board")return(<div><SaveBar/><div style={{paddingTop:32}}><BoardView getBoard={getBoard} getGrade={getGrade} rankedGroups={rankedGroups} setPhase={setPhase} setSelectedPlayer={setSelectedPlayer} setActivePos={setActivePos} traits={traits} compareList={compareList} setCompareList={setCompareList} setProfilePlayer={setProfilePlayer} setShowMockDraft={setShowMockDraft} communityBoard={communityBoard} setCommunityBoard={setCommunityBoard} ratings={ratings} byPos={byPos}/></div>{profilePlayer&&<PlayerProfile player={profilePlayer} traits={traits} setTraits={setTraits} notes={notes} setNotes={setNotes} allProspects={PROSPECTS} getGrade={getGrade} onClose={()=>setProfilePlayer(null)} onSelectPlayer={setProfilePlayer} consensus={CONSENSUS} ratings={ratings}/>}</div>);

  return(<>{profilePlayer&&<PlayerProfile player={profilePlayer} traits={traits} setTraits={setTraits} notes={notes} setNotes={setNotes} allProspects={PROSPECTS} getGrade={getGrade} onClose={()=>setProfilePlayer(null)} onSelectPlayer={setProfilePlayer} consensus={CONSENSUS} ratings={ratings}/>}</>);
}

function DraggableRankList({ranked,activePos,cur,c,getGrade,setSelectedPlayer,movePlayer,setProfilePlayer,font,mono,sans}){
  const[dragIdx,setDragIdx]=useState(null);
  const[overIdx,setOverIdx]=useState(null);
  const handleDragStart=(e,i)=>{setDragIdx(i);e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',i);};
  const handleDragOver=(e,i)=>{e.preventDefault();e.dataTransfer.dropEffect='move';setOverIdx(i);};
  const handleDrop=(e,i)=>{e.preventDefault();if(dragIdx!==null&&dragIdx!==i)movePlayer(activePos,dragIdx,i);setDragIdx(null);setOverIdx(null);};
  const handleDragEnd=()=>{setDragIdx(null);setOverIdx(null);};
  return(
    <div style={{flex:"1 1 260px",minWidth:220,maxWidth:400,background:"#fff",border:"1px solid #e5e5e5",borderRadius:12,overflow:"hidden"}}>
      <div style={{fontFamily:mono,fontSize:10,letterSpacing:2,color:"#a3a3a3",textTransform:"uppercase",padding:"12px 16px 4px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <span>rankings</span><span style={{fontSize:9,letterSpacing:1,color:"#d4d4d4",fontWeight:400}}>drag to reorder</span>
      </div>
      <div style={{maxHeight:480,overflowY:"auto"}}>
        {ranked.map((p,i)=>(
          <div key={p.id} draggable onDragStart={e=>handleDragStart(e,i)} onDragOver={e=>handleDragOver(e,i)} onDrop={e=>handleDrop(e,i)} onDragEnd={handleDragEnd} onClick={()=>setSelectedPlayer(p)}
            style={{display:"flex",alignItems:"center",gap:6,padding:"7px 12px 7px 8px",borderLeft:cur?.id===p.id?`3px solid ${c}`:"3px solid transparent",background:dragIdx===i?"#f0f0f0":overIdx===i&&dragIdx!==null?`${c}0a`:cur?.id===p.id?`${c}06`:"transparent",cursor:"grab",userSelect:"none",borderBottom:overIdx===i&&dragIdx!==null?`2px solid ${c}`:"1px solid transparent",transition:"background 0.1s",opacity:dragIdx===i?0.5:1}}>
            <span style={{fontFamily:mono,fontSize:9,color:"#d4d4d4",cursor:"grab",padding:"0 2px",flexShrink:0}}>⠿</span>
            <span style={{fontFamily:mono,fontSize:11,color:"#d4d4d4",width:16,textAlign:"right",flexShrink:0}}>{i+1}</span>
            <SchoolLogo school={p.school} size={18}/>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontFamily:sans,fontSize:11,fontWeight:600,color:"#171717",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",cursor:"pointer"}} onClick={e=>{e.stopPropagation();setProfilePlayer(p);}} onMouseEnter={e=>e.currentTarget.style.textDecoration="underline"} onMouseLeave={e=>e.currentTarget.style.textDecoration="none"}>{p.name}</div>
            </div>
            <span style={{fontFamily:font,fontSize:12,fontWeight:900,color:getGrade(p.id)>=75?"#16a34a":getGrade(p.id)>=55?"#ca8a04":"#dc2626",flexShrink:0}}>{getGrade(p.id)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function BoardView({getBoard,getGrade,rankedGroups,setPhase,setSelectedPlayer,setActivePos,traits,compareList,setCompareList,setProfilePlayer,setShowMockDraft,communityBoard,setCommunityBoard,ratings,byPos}){
  const[filterPos,setFilterPos]=useState(new Set());const[showCommunity,setShowCommunity]=useState(false);const board=getBoard();const display=filterPos.size>0?board.filter(p=>filterPos.has(p.gpos||p.pos)):board;
  const compPlayers=compareList.map(id=>board.find(p=>p.id===id)).filter(Boolean);
  const samePos=compPlayers.length>=2&&compPlayers.every(p=>p.pos===compPlayers[0].pos);
  const compColors=["#2563eb","#dc2626","#16a34a","#f59e0b"];
  const[showCompareTip,setShowCompareTip]=useState(()=>{try{return!localStorage.getItem('bbl_compare_tip_seen');}catch(e){return true;}});
  const dismissCompareTip=()=>{setShowCompareTip(false);try{localStorage.setItem('bbl_compare_tip_seen','1');}catch(e){}};

  // Share top 10 as X-optimized image (1200x675)
  const shareTop10=useCallback(async()=>{
    const singlePos=filterPos.size===1?[...filterPos][0]:null;
    const top10=(singlePos?board.filter(p=>(p.gpos||p.pos)===singlePos):board).slice(0,10);
    if(top10.length===0)return;

    const scale=2;
    const W=1080,rowH=120,headerH=80,footerH=48;
    const H=headerH+rowH*top10.length+footerH+20;
    const canvas=document.createElement('canvas');canvas.width=W*scale;canvas.height=H*scale;
    const ctx=canvas.getContext('2d');ctx.scale(scale,scale);

    // Background
    ctx.fillStyle='#faf9f6';ctx.fillRect(0,0,W,H);

    // Gradient top bar
    const tGrad=ctx.createLinearGradient(0,0,W,0);
    tGrad.addColorStop(0,'#ec4899');tGrad.addColorStop(1,'#7c3aed');
    ctx.fillStyle=tGrad;ctx.fillRect(0,0,W,4);

    // Header
    ctx.textBaseline='top';ctx.textAlign='left';
    ctx.fillStyle='#171717';ctx.font='bold 28px -apple-system,system-ui,sans-serif';
    const title=singlePos?`MY TOP 10 ${singlePos}s`:'MY BIG BOARD — TOP 10';
    ctx.fillText(title,32,20);
    ctx.fillStyle='#a3a3a3';ctx.font='10px ui-monospace,monospace';
    ctx.fillText('BIGBOARDLAB.COM  ·  2026 NFL DRAFT',32,52);

    // Separator
    const sGrad=ctx.createLinearGradient(32,0,W-32,0);
    sGrad.addColorStop(0,'#ec4899');sGrad.addColorStop(1,'#7c3aed');
    ctx.fillStyle=sGrad;ctx.fillRect(32,headerH-6,W-64,2);

    // Load school logos
    const logoCache={};
    const schools=[...new Set(top10.map(p=>p.school))];
    await Promise.all(schools.map(async s=>{
      const url=schoolLogo(s);
      if(!url)return;
      try{const img=new Image();img.crossOrigin='anonymous';img.src=url;await new Promise((res,rej)=>{img.onload=res;img.onerror=rej;setTimeout(rej,2000);});logoCache[s]=img;}catch(e){}
    }));

    // Draw radar chart on canvas
    const drawRadar=(cx,cy,r,traitNames,values,color)=>{
      const n=traitNames.length;if(n<3)return;
      const angles=traitNames.map((_,i)=>(Math.PI*2*i)/n-Math.PI/2);
      // Grid rings
      ctx.strokeStyle='#e0e0e0';ctx.lineWidth=0.5;
      [0.25,0.5,0.75,1].forEach(lv=>{
        ctx.beginPath();
        angles.forEach((a,i)=>{const x=cx+r*lv*Math.cos(a),y=cy+r*lv*Math.sin(a);i===0?ctx.moveTo(x,y):ctx.lineTo(x,y);});
        ctx.closePath();ctx.stroke();
      });
      // Spokes
      angles.forEach(a=>{ctx.beginPath();ctx.moveTo(cx,cy);ctx.lineTo(cx+r*Math.cos(a),cy+r*Math.sin(a));ctx.stroke();});
      // Data polygon
      const pts=angles.map((a,i)=>{const v=(values[i]||50)/100;return[cx+r*v*Math.cos(a),cy+r*v*Math.sin(a)];});
      ctx.beginPath();pts.forEach(([x,y],i)=>i===0?ctx.moveTo(x,y):ctx.lineTo(x,y));ctx.closePath();
      ctx.fillStyle=color+'25';ctx.fill();ctx.strokeStyle=color;ctx.lineWidth=1.5;ctx.stroke();
      // Dots
      pts.forEach(([x,y])=>{ctx.beginPath();ctx.arc(x,y,2,0,Math.PI*2);ctx.fillStyle=color;ctx.fill();});
      // Labels
      ctx.fillStyle='#999';ctx.font='7px -apple-system,system-ui,sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';
      traitNames.forEach((t,i)=>{
        const lr=r+18;const x=cx+lr*Math.cos(angles[i]),y=cy+lr*Math.sin(angles[i]);
        ctx.fillText(t,x,y);
      });
      ctx.textAlign='left';ctx.textBaseline='top';
    };

    // Compute position ranks for all board players
    const posRanks={};
    board.forEach((p,i)=>{
      const pk=(p.gpos||p.pos)==='K'||(p.gpos||p.pos)==='P'||(p.gpos||p.pos)==='LS'?'K/P':(p.gpos||p.pos);
      if(!posRanks[pk])posRanks[pk]=0;
      posRanks[pk]++;
      p._posRank=posRanks[pk];
    });

    // Rows
    top10.forEach((p,i)=>{
      const y=headerH+i*rowH;
      const grade=getGrade(p.id);
      const posKey=(p.gpos||p.pos)==='K'||(p.gpos||p.pos)==='P'||(p.gpos||p.pos)==='LS'?'K/P':(p.gpos||p.pos);
      const c=POS_COLORS[posKey]||POS_COLORS[p.pos]||'#525252';
      const posTraits=POSITION_TRAITS[p.pos]||POSITION_TRAITS[posKey]||[];
      const traitVals=posTraits.map(t=>traits[p.id]?.[t]||50);

      // Alt row bg
      if(i%2===0){ctx.fillStyle='rgba(0,0,0,0.015)';ctx.fillRect(24,y,W-48,rowH);}
      // Left accent
      ctx.fillStyle=c;ctx.fillRect(24,y+8,3,rowH-16);

      // Rank
      ctx.fillStyle='#d4d4d4';ctx.font='bold 18px ui-monospace,monospace';
      ctx.textAlign='right';ctx.fillText(`${i+1}`.padStart(2,' '),64,y+48);ctx.textAlign='left';

      // Pos pill
      ctx.fillStyle=c+'18';
      const posText=p.gpos||p.pos;
      ctx.font='bold 11px ui-monospace,monospace';
      const pw=ctx.measureText(posText).width+14;
      const rr=(x,ry,w,h,rad)=>{ctx.beginPath();ctx.moveTo(x+rad,ry);ctx.lineTo(x+w-rad,ry);ctx.quadraticCurveTo(x+w,ry,x+w,ry+rad);ctx.lineTo(x+w,ry+h-rad);ctx.quadraticCurveTo(x+w,ry+h,x+w-rad,ry+h);ctx.lineTo(x+rad,ry+h);ctx.quadraticCurveTo(x,ry+h,x,ry+h-rad);ctx.lineTo(x,ry+rad);ctx.quadraticCurveTo(x,ry,x+rad,ry);ctx.closePath();};
      rr(78,y+42,pw,20,4);ctx.fill();
      ctx.fillStyle=c;ctx.fillText(posText,85,y+47);

      // School logo
      const logoX=78+pw+14;
      if(logoCache[p.school])ctx.drawImage(logoCache[p.school],logoX,y+28,40,40);

      // Name + school + position rank
      const nameX=logoX+50;
      ctx.fillStyle='#171717';ctx.font='bold 18px -apple-system,system-ui,sans-serif';
      ctx.fillText(p.name,nameX,y+32);
      ctx.fillStyle='#a3a3a3';ctx.font='12px -apple-system,system-ui,sans-serif';
      ctx.fillText(p.school,nameX,y+54);
      // Position rank label
      if(p._posRank){
        const prText=posText+p._posRank;
        const schoolW=ctx.measureText(p.school).width;
        ctx.fillStyle=c;ctx.font='bold 10px ui-monospace,monospace';
        ctx.fillText(prText,nameX+schoolW+10,y+55);
      }

      // Radar chart (shifted left for full labels)
      const radarCx=W-210,radarCy=y+rowH/2,radarR=34;
      if(posTraits.length>=3)drawRadar(radarCx,radarCy,radarR,posTraits,traitVals,c);

      // Grade
      const gColor=grade>=75?'#16a34a':grade>=55?'#ca8a04':'#dc2626';
      ctx.fillStyle=gColor;ctx.font='bold 32px -apple-system,system-ui,sans-serif';
      ctx.textAlign='right';ctx.fillText(`${grade}`,W-42,y+42);ctx.textAlign='left';
    });

    // Load logo for footer
    let logoImg=null;
    try{logoImg=new Image();logoImg.src='/logo.png';await new Promise((res,rej)=>{logoImg.onload=res;logoImg.onerror=rej;setTimeout(rej,2000);});}catch(e){logoImg=null;}

    // Footer
    const fy=H-footerH;
    ctx.fillStyle='#111';ctx.fillRect(0,fy,W,footerH);
    const logoOffset=logoImg?36:0;
    if(logoImg)ctx.drawImage(logoImg,24,fy+8,32,32);
    ctx.fillStyle='#fff';ctx.font='bold 13px -apple-system,system-ui,sans-serif';
    ctx.textBaseline='middle';
    ctx.fillText('bigboardlab.com',24+logoOffset+8,fy+footerH/2);
    ctx.fillStyle='#888';ctx.font='11px -apple-system,system-ui,sans-serif';
    ctx.textAlign='right';
    ctx.fillText(`${new Date().toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}).toUpperCase()}  ·  BUILD YOURS → BIGBOARDLAB.COM`,W-32,fy+footerH/2);
    ctx.textAlign='left';ctx.textBaseline='top';
    // Gradient bottom bar
    const bGrad=ctx.createLinearGradient(0,0,W,0);bGrad.addColorStop(0,'#ec4899');bGrad.addColorStop(1,'#7c3aed');
    ctx.fillStyle=bGrad;ctx.fillRect(0,H-3,W,3);

    // Export
    canvas.toBlob(async blob=>{
      if(!blob)return;
      const fname=singlePos?`bigboardlab-top10-${singlePos}.png`:'bigboardlab-top10.png';
      const isMobile=/iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      if(isMobile&&navigator.share&&navigator.canShare){
        try{const file=new File([blob],fname,{type:'image/png'});if(navigator.canShare({files:[file]})){await navigator.share({files:[file],title:'My Big Board — Big Board Lab',text:'My 2026 NFL Draft Big Board! Build yours at bigboardlab.com'});return;}}catch(e){}
      }
      try{await navigator.clipboard.write([new ClipboardItem({'image/png':blob})]);
        const toast=document.createElement('div');toast.textContent='📋 copied to clipboard';toast.style.cssText='position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#171717;color:#faf9f6;padding:10px 20px;border-radius:99px;font-family:-apple-system,sans-serif;font-size:13px;z-index:9999;';document.body.appendChild(toast);setTimeout(()=>toast.remove(),2500);
      }catch(e){const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=fname;a.click();URL.revokeObjectURL(url);}
    });
  },[board,getGrade,filterPos,traits]);

  // Load community board
  const loadCommunity=useCallback(async()=>{
    try{
      const{data}=await supabase.from('community_boards').select('board_data');
      if(data&&data.length>0){
        const agg={};let count=0;
        data.forEach(row=>{count++;const bd=row.board_data;Object.entries(bd).forEach(([pid,rating])=>{if(!agg[pid])agg[pid]={total:0,count:0};agg[pid].total+=rating;agg[pid].count++;});});
        const avg={};const voterCount={};Object.entries(agg).forEach(([pid,{total,count:c}])=>{avg[pid]=total/c;voterCount[pid]=c;});
        setCommunityBoard({ratings:avg,totalUsers:count,voterCount});
        setShowCommunity(true);
      }
    }catch(e){console.error(e);}
  },[]);

  return(<div style={{minHeight:"100vh",background:"#faf9f6",fontFamily:font}}><div style={{maxWidth:800,margin:"0 auto",padding:"40px 24px"}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}><h1 style={{fontSize:36,fontWeight:900,color:"#171717",margin:0,letterSpacing:-1}}>your big board</h1><div style={{display:"flex",gap:8}}><button onClick={()=>setPhase("pick-position")} style={{fontFamily:sans,fontSize:12,padding:"8px 16px",background:"transparent",border:"1px solid #e5e5e5",borderRadius:99,cursor:"pointer",color:"#a3a3a3"}}>← edit</button></div></div><p style={{fontFamily:sans,fontSize:13,color:"#a3a3a3",margin:"0 0 12px"}}>{display.length} prospects ranked</p>

    <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:12}}>
      {filterPos.size<=1&&<button onClick={shareTop10} style={{fontFamily:sans,fontSize:11,fontWeight:600,padding:"6px 14px",background:"#171717",color:"#faf9f6",border:"none",borderRadius:99,cursor:"pointer"}}>📤 share top 10</button>}
      <button onClick={()=>setShowMockDraft(true)} style={{fontFamily:sans,fontSize:11,fontWeight:600,padding:"6px 14px",background:"transparent",color:"#525252",border:"1px solid #e5e5e5",borderRadius:99,cursor:"pointer"}}>🏈 mock draft</button>
    </div>

    {showCommunity&&communityBoard&&<div style={{background:"#fff",border:"1px solid #e5e5e5",borderRadius:12,padding:"16px 20px",marginBottom:16}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
        <div><span style={{fontFamily:mono,fontSize:10,letterSpacing:2,color:"#a3a3a3",textTransform:"uppercase"}}>community consensus</span><span style={{fontFamily:mono,fontSize:10,color:"#d4d4d4",marginLeft:8}}>{communityBoard.totalUsers} users</span></div>
        <button onClick={()=>setShowCommunity(false)} style={{fontFamily:sans,fontSize:10,color:"#a3a3a3",background:"none",border:"1px solid #e5e5e5",borderRadius:99,padding:"3px 10px",cursor:"pointer"}}>hide</button>
      </div>
      {/* Overall top 25 */}
      <div style={{fontFamily:mono,fontSize:8,letterSpacing:1.5,color:"#a3a3a3",textTransform:"uppercase",marginBottom:6}}>overall top 25</div>
      {PROSPECTS.filter(p=>communityBoard.ratings[p.id]).sort((a,b)=>(communityBoard.ratings[b.id]||0)-(communityBoard.ratings[a.id]||0)).slice(0,25).map((p,i)=>{
        const userIdx=board.findIndex(x=>x.id===p.id);const diff=userIdx>=0?i-userIdx:null;const c=POS_COLORS[p.gpos||p.pos]||POS_COLORS[p.pos];const voters=communityBoard.voterCount?.[p.id]||0;
        return<div key={p.id} style={{display:"flex",alignItems:"center",gap:8,padding:"4px 0",borderBottom:i<24?"1px solid #f8f8f8":"none"}}>
          <span style={{fontFamily:mono,fontSize:10,color:"#d4d4d4",width:20,textAlign:"right"}}>{i+1}</span>
          <span style={{fontFamily:mono,fontSize:9,color:c,width:32}}>{p.gpos||p.pos}</span>
          <SchoolLogo school={p.school} size={16}/>
          <span style={{fontFamily:sans,fontSize:12,fontWeight:600,color:"#171717",flex:1}}>{p.name}</span>
          {voters>1&&<span style={{fontFamily:mono,fontSize:8,color:"#a3a3a3"}}>{voters} votes</span>}
          {diff!==null&&<span style={{fontFamily:mono,fontSize:9,color:diff>0?"#16a34a":diff<0?"#dc2626":"#a3a3a3"}}>{diff>0?`↑${diff}`:diff<0?`↓${Math.abs(diff)}`:"="}</span>}
        </div>;
      })}
      {/* Per-position top 5 */}
      <div style={{fontFamily:mono,fontSize:8,letterSpacing:1.5,color:"#a3a3a3",textTransform:"uppercase",marginTop:16,marginBottom:8}}>by position</div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill, minmax(200px, 1fr))",gap:8}}>
        {POSITION_GROUPS.filter(g=>g!=="K/P").map(gpos=>{
          const posPlayers=PROSPECTS.filter(p=>(p.gpos||p.pos)===gpos&&communityBoard.ratings[p.id]).sort((a,b)=>(communityBoard.ratings[b.id]||0)-(communityBoard.ratings[a.id]||0)).slice(0,5);
          if(posPlayers.length===0)return null;const c=POS_COLORS[gpos]||"#737373";
          return<div key={gpos} style={{background:"#f9f9f7",borderRadius:8,padding:"8px 10px"}}>
            <div style={{fontFamily:font,fontSize:14,fontWeight:900,color:c,marginBottom:4}}>{gpos}</div>
            {posPlayers.map((p,i)=>{
              const myRank=byPos[gpos]?[...byPos[gpos]].sort((a,b)=>(ratings[b.id]||1500)-(ratings[a.id]||1500)).findIndex(x=>x.id===p.id)+1:-1;
              return<div key={p.id} style={{display:"flex",alignItems:"center",gap:4,padding:"2px 0"}}>
                <span style={{fontFamily:mono,fontSize:9,color:"#d4d4d4",width:14,textAlign:"right"}}>{i+1}</span>
                <span style={{fontFamily:sans,fontSize:11,fontWeight:500,color:"#171717",flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.name}</span>
                {myRank>0&&rankedGroups.has(gpos)&&<span style={{fontFamily:mono,fontSize:8,color:myRank<=i+1?"#16a34a":"#dc2626"}}>you: #{myRank}</span>}
              </div>;
            })}
          </div>;
        })}
      </div>
    </div>}

    <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:20}}><button onClick={()=>setFilterPos(new Set())} style={{fontFamily:mono,fontSize:11,padding:"5px 14px",background:filterPos.size===0?"#171717":"transparent",color:filterPos.size===0?"#faf9f6":"#a3a3a3",border:"1px solid #e5e5e5",borderRadius:99,cursor:"pointer"}}>all</button>{POSITION_GROUPS.filter(p=>rankedGroups.has(p)).map(pos=>{const active=filterPos.has(pos);return<button key={pos} onClick={()=>setFilterPos(prev=>{const n=new Set(prev);if(n.has(pos))n.delete(pos);else n.add(pos);return n;})} style={{fontFamily:mono,fontSize:11,padding:"5px 14px",background:active?`${POS_COLORS[pos]}11`:"transparent",color:active?POS_COLORS[pos]:"#a3a3a3",border:`1px solid ${active?POS_COLORS[pos]+"33":"#e5e5e5"}`,borderRadius:99,cursor:"pointer"}}>{pos}</button>;})}</div>{showCompareTip&&compareList.length===0&&<div style={{background:"linear-gradient(135deg,#fdf4ff,#f5f3ff)",border:"1px solid #e9d5ff",borderRadius:12,padding:"12px 16px",marginBottom:16,display:"flex",alignItems:"center",justifyContent:"space-between"}}><span style={{fontFamily:sans,fontSize:13,color:"#7c3aed"}}>💡 Click rows to compare up to 4 prospects head-to-head on traits</span><button onClick={dismissCompareTip} style={{fontFamily:sans,fontSize:11,color:"#a3a3a3",background:"none",border:"none",cursor:"pointer",flexShrink:0}}>✕</button></div>}{compareList.length>0&&<div style={{background:"#fff",border:"1px solid #e5e5e5",borderRadius:12,padding:16,marginBottom:16}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
        <span style={{fontFamily:mono,fontSize:10,color:"#a3a3a3",letterSpacing:1,textTransform:"uppercase"}}>compare {compareList.length} player{compareList.length!==1?"s":""}</span>
        <button onClick={()=>setCompareList([])} style={{fontFamily:sans,fontSize:11,color:"#a3a3a3",background:"none",border:"1px solid #e5e5e5",borderRadius:99,padding:"4px 12px",cursor:"pointer"}}>clear</button>
      </div>
      <div style={{display:"grid",gridTemplateColumns:`repeat(${compPlayers.length},1fr)`,gap:16}}>
        {compPlayers.map((p,ci)=>{const c=compColors[ci];const grade=getGrade(p.id);return<div key={p.id} style={{textAlign:"center",borderLeft:ci>0?"1px solid #f5f5f5":"none",paddingLeft:ci>0?16:0}}>
          <div style={{width:8,height:8,borderRadius:99,background:c,margin:"0 auto 6px"}}/>
          <SchoolLogo school={p.school} size={28}/>
          <div style={{fontFamily:sans,fontSize:13,fontWeight:700,color:"#171717",marginTop:4,cursor:"pointer"}} onClick={()=>setProfilePlayer(p)} onMouseEnter={e=>e.currentTarget.style.textDecoration="underline"} onMouseLeave={e=>e.currentTarget.style.textDecoration="none"}>{p.name}</div>
          <div style={{fontFamily:mono,fontSize:10,color:"#a3a3a3"}}>{p.gpos||p.pos} · {p.school}</div>
          <div style={{fontFamily:font,fontSize:24,fontWeight:900,color:grade>=75?"#16a34a":grade>=55?"#ca8a04":"#dc2626",marginTop:4}}>{grade}</div>
          <button onClick={()=>setCompareList(prev=>prev.filter(id=>id!==p.id))} style={{fontFamily:mono,fontSize:9,color:"#d4d4d4",background:"none",border:"none",cursor:"pointer",marginTop:4}}>remove</button>
        </div>;})}
      </div>
      {samePos&&<>
        <div style={{display:"flex",justifyContent:"center",gap:8,marginTop:16,flexWrap:"wrap"}}>
          {compPlayers.map((p,ci)=>{const posTraits=POSITION_TRAITS[p.pos]||[];return<div key={p.id} style={{position:"relative"}}>
            <RadarChart traits={posTraits} values={posTraits.map(t=>traits[p.id]?.[t]||50)} color={compColors[ci]} size={160}/>
            <div style={{position:"absolute",bottom:0,left:"50%",transform:"translateX(-50%)",fontFamily:mono,fontSize:9,color:compColors[ci],whiteSpace:"nowrap"}}>{p.name.split(" ").pop()}</div>
          </div>;})}
        </div>
        <div style={{marginTop:12}}>
          {(POSITION_TRAITS[compPlayers[0].pos]||[]).map(trait=><div key={trait} style={{display:"grid",gridTemplateColumns:`100px repeat(${compPlayers.length},1fr)`,gap:8,padding:"4px 0",borderBottom:"1px solid #f8f8f8",alignItems:"center"}}>
            <span style={{fontFamily:mono,fontSize:10,color:"#a3a3a3"}}>{trait}</span>
            {compPlayers.map((p,ci)=>{const val=traits[p.id]?.[trait]||50;const best=Math.max(...compPlayers.map(cp=>traits[cp.id]?.[trait]||50));const worst=Math.min(...compPlayers.map(cp=>traits[cp.id]?.[trait]||50));return<div key={p.id} style={{textAlign:"center"}}>
              <span style={{fontFamily:font,fontSize:13,fontWeight:700,color:compPlayers.length>1&&val===best&&best!==worst?compColors[ci]:compPlayers.length>1&&val===worst&&best!==worst?"#d4d4d4":"#525252"}}>{val}</span>
            </div>;})}
          </div>)}
        </div>
      </>}
      {!samePos&&compPlayers.length>=2&&<div style={{fontFamily:sans,fontSize:11,color:"#a3a3a3",textAlign:"center",marginTop:12,fontStyle:"italic"}}>select players at the same position for trait comparison & spider charts</div>}
    </div>}<div style={{background:"#fff",border:"1px solid #e5e5e5",borderRadius:12,overflow:"hidden"}}>{display.map((p,i)=>{const grade=getGrade(p.id);const c=POS_COLORS[p.gpos||p.pos]||POS_COLORS[p.pos];const cIdx=compareList.indexOf(p.id);const isC=cIdx>=0;return<div key={p.id} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 16px",borderBottom:i<display.length-1?"1px solid #f5f5f5":"none",cursor:"pointer",background:isC?`${compColors[cIdx]}08`:"transparent"}} onMouseEnter={e=>{if(!isC)e.currentTarget.style.background=`${c}06`;}} onMouseLeave={e=>{if(!isC)e.currentTarget.style.background="transparent";}} onClick={()=>{if(showCompareTip)dismissCompareTip();if(isC)setCompareList(prev=>prev.filter(id=>id!==p.id));else if(compareList.length<4)setCompareList(prev=>[...prev,p.id]);}} onDoubleClick={()=>{setSelectedPlayer(p);setActivePos(p.gpos||p.pos);setPhase("traits");}}>{isC&&<div style={{width:6,height:6,borderRadius:99,background:compColors[cIdx],flexShrink:0}}/>}<div style={{width:84,flexShrink:0,display:"flex",alignItems:"center",gap:8}}><span style={{fontFamily:mono,fontSize:12,color:"#d4d4d4",width:24,textAlign:"right",flexShrink:0}}>{i+1}</span><span style={{fontFamily:mono,fontSize:10,fontWeight:500,color:c,background:`${c}0d`,padding:"2px 8px",borderRadius:4}}>{p.gpos||p.pos}</span></div><SchoolLogo school={p.school} size={24}/><div style={{flex:1,minWidth:0,marginLeft:10}}><span style={{fontFamily:sans,fontSize:14,fontWeight:700,color:"#171717",cursor:"pointer"}} onClick={e=>{e.stopPropagation();setProfilePlayer(p);}} onMouseEnter={e=>e.currentTarget.style.textDecoration="underline"} onMouseLeave={e=>e.currentTarget.style.textDecoration="none"}>{p.name}</span><span style={{fontFamily:mono,fontSize:11,color:"#a3a3a3",marginLeft:8}}>{p.school}</span></div><div style={{width:80,display:"flex",alignItems:"center",gap:6,flexShrink:0}}><div style={{flex:1,height:4,background:"#f5f5f5",borderRadius:2,overflow:"hidden"}}><div style={{height:"100%",width:`${grade}%`,background:c,borderRadius:2,opacity:.6}}/></div><span style={{fontFamily:font,fontSize:14,fontWeight:900,color:grade>=75?"#16a34a":grade>=55?"#ca8a04":"#dc2626",width:24,textAlign:"right"}}>{grade}</span></div></div>;})}</div><p style={{fontFamily:sans,fontSize:11,color:"#a3a3a3",textAlign:"center",marginTop:16}}>click name for profile · click row to compare (up to 4) · double-click to edit</p></div></div>);
}

// ============================================================
// Admin Dashboard (gated by email)
// ============================================================
const ADMIN_EMAILS=["hunteransley@gmail.com"];
function AdminDashboard({user,onBack}){
  const[stats,setStats]=useState(null);
  const[loading,setLoading]=useState(true);
  const[users,setUsers]=useState([]);
  const[events,setEvents]=useState([]);
  useEffect(()=>{
    (async()=>{
      try{
        // Fetch from all sources in parallel
        const[boardsRes,communityRes,evtsRes,authCountRes,authUsersRes]=await Promise.all([
          supabase.from('boards').select('user_id,board_data,updated_at'),
          supabase.from('community_boards').select('user_id,board_data'),
          supabase.from('events').select('*').order('created_at',{ascending:false}).limit(1000),
          supabase.rpc('get_auth_user_count'),
          supabase.rpc('get_auth_users_summary'),
        ]);
        const boards=boardsRes.data||[];
        const community=communityRes.data||[];
        const allEvents=evtsRes.data||[];
        const totalUsers=authCountRes.data||0;
        const authUsers=authUsersRes.data||[];

        const now=new Date();

        // Auth-based activity (most accurate)
        const activeToday=authUsers.filter(u=>u.last_sign_in_at&&(now-new Date(u.last_sign_in_at))<86400000).length;
        const activeWeek=authUsers.filter(u=>u.last_sign_in_at&&(now-new Date(u.last_sign_in_at))<604800000).length;

        // Real signups from auth (created_at = account creation, not login)
        const signupsToday=authUsers.filter(u=>(now-new Date(u.created_at))<86400000).length;
        const signupsWeek=authUsers.filter(u=>(now-new Date(u.created_at))<604800000).length;

        // Event counts by type (deduplicated where relevant)
        const eventCounts={};
        allEvents.forEach(e=>{eventCounts[e.event]=(eventCounts[e.event]||0)+1;});
        // Unique users who did each event type
        const uniqueEventUsers={};
        allEvents.forEach(e=>{if(!uniqueEventUsers[e.event])uniqueEventUsers[e.event]=new Set();uniqueEventUsers[e.event].add(e.user_id);});

        // Mock drafts — unique sessions (count events, not unique users)
        const mockDrafts=allEvents.filter(e=>e.event==='mock_draft_started').length;
        const mockDraftUsers=new Set(allEvents.filter(e=>e.event==='mock_draft_started').map(e=>e.user_id)).size;

        // Rankings completed
        const rankingsCompleted=allEvents.filter(e=>e.event==='ranking_completed').length;

        // Position ranking stats from boards
        const posStats={};
        const partialCount={};
        let hasNotes=0;
        const boardMap=new Map(boards.map(b=>[b.user_id,b]));
        boards.forEach(b=>{
          const d=b.board_data||{};
          const rg=d.rankedGroups||[];
          const pp=d.partialProgress?Object.keys(d.partialProgress):[];
          if(d.notes&&Object.keys(d.notes).length>0)hasNotes++;
          rg.forEach(pos=>{posStats[pos]=(posStats[pos]||0)+1;});
          pp.forEach(pos=>{partialCount[pos]=(partialCount[pos]||0)+1;});
        });

        // Build user list from auth (source of truth)
        const userDetails=authUsers.map(au=>{
          const b=boardMap.get(au.id);
          const d=b?.board_data||{};
          const rg=d.rankedGroups||[];
          const pp=d.partialProgress?Object.keys(d.partialProgress):[];
          const noteCount=d.notes?Object.keys(d.notes).length:0;
          const userEvts=allEvents.filter(e=>e.user_id===au.id);
          const lastEvent=userEvts[0];
          const lastActivity=new Date(Math.max(
            au.last_sign_in_at?new Date(au.last_sign_in_at):0,
            b?new Date(b.updated_at):0,
            lastEvent?new Date(lastEvent.created_at):0
          ));
          return{
            userId:au.id,
            email:au.email||'',
            createdAt:au.created_at,
            updatedAt:lastActivity.toISOString(),
            rankedPositions:rg.length,
            partialPositions:pp.length,
            noteCount,
            eventCount:userEvts.length,
            hasBoard:!!b,
          };
        }).sort((a,b)=>new Date(b.updatedAt)-new Date(a.updatedAt));

        const rankers=userDetails.filter(u=>u.rankedPositions>0);
        const avgPositions=rankers.length>0?(rankers.reduce((s,u)=>s+u.rankedPositions,0)/rankers.length).toFixed(1):0;

        setStats({totalUsers,activeToday,activeWeek,posStats,partialCount,avgPositions,hasNotes,
          communityUsers:community.length,eventCounts,uniqueEventUsers,signupsToday,signupsWeek,
          mockDrafts,mockDraftUsers,rankingsCompleted,
          // Funnel: compute from auth users + boards + events
          funnelSignedUp:totalUsers,
          funnelStartedRanking:new Set(allEvents.filter(e=>e.event==='ranking_started').map(e=>e.user_id)).size||boards.filter(b=>{const d=b.board_data||{};return(d.rankedGroups||[]).length>0||(d.partialProgress&&Object.keys(d.partialProgress).length>0);}).length,
          funnelCompletedPos:new Set([...allEvents.filter(e=>e.event==='ranking_completed').map(e=>e.user_id),...boards.filter(b=>(b.board_data?.rankedGroups||[]).length>0).map(b=>b.user_id)]).size,
          funnelRanMock:new Set(allEvents.filter(e=>e.event==='mock_draft_started').map(e=>e.user_id)).size,
          funnelShared:new Set(allEvents.filter(e=>e.event==='share_triggered').map(e=>e.user_id)).size,
        });
        setUsers(userDetails);
        setEvents(allEvents.slice(0,50));
      }catch(e){console.error('Admin fetch error:',e);}
      setLoading(false);
    })();
  },[]);
  if(loading)return<div style={{minHeight:"100vh",background:"#faf9f6",display:"flex",alignItems:"center",justifyContent:"center"}}><p style={{fontFamily:sans,fontSize:14,color:"#a3a3a3"}}>loading admin...</p></div>;

  // Compute user status tags
  const tagUser=(u)=>{
    if(u.rankedPositions>=6)return{label:"power user",color:"#16a34a",bg:"#f0fdf4"};
    if(u.rankedPositions>0)return{label:"engaged",color:"#3b82f6",bg:"#eff6ff"};
    if(u.eventCount>2)return{label:"exploring",color:"#ca8a04",bg:"#fefce8"};
    if(u.hasBoard)return{label:"signed up",color:"#a3a3a3",bg:"#fafafa"};
    return{label:"bounced",color:"#d4d4d4",bg:"#fafafa"};
  };

  return(
    <div style={{minHeight:"100vh",background:"#faf9f6",fontFamily:font}}>
      <div style={{position:"fixed",top:0,left:0,right:0,zIndex:100,display:"flex",justifyContent:"space-between",alignItems:"center",padding:"6px 16px",background:"#171717",borderBottom:"1px solid #333"}}>
        <span style={{fontFamily:mono,fontSize:11,color:"#faf9f6",letterSpacing:2}}>⚙️ ADMIN DASHBOARD</span>
        <button onClick={onBack} style={{fontFamily:sans,fontSize:11,color:"#a3a3a3",background:"none",border:"1px solid #444",borderRadius:99,padding:"3px 12px",cursor:"pointer"}}>← back to app</button>
      </div>
      <div style={{maxWidth:920,margin:"0 auto",padding:"52px 24px 60px"}}>

        {/* FUNNEL */}
        <div style={{background:"#fff",border:"1px solid #e5e5e5",borderRadius:12,padding:"20px 24px",marginBottom:24}}>
          <div style={{fontFamily:mono,fontSize:9,letterSpacing:2,color:"#a3a3a3",textTransform:"uppercase",marginBottom:14}}>user funnel</div>
          {[
            {label:"Signed Up",count:stats.funnelSignedUp,color:"#171717"},
            {label:"Started Ranking",count:stats.funnelStartedRanking,color:"#3b82f6"},
            {label:"Completed a Position",count:stats.funnelCompletedPos,color:"#8b5cf6"},
            {label:"Ran Mock Draft",count:stats.funnelRanMock,color:"#f59e0b"},
            {label:"Shared Results",count:stats.funnelShared,color:"#22c55e"},
          ].map((step,i)=>{
            const pct=stats.funnelSignedUp>0?Math.round(step.count/stats.funnelSignedUp*100):0;
            const barW=stats.funnelSignedUp>0?Math.max(step.count/stats.funnelSignedUp*100,2):0;
            return<div key={step.label} style={{marginBottom:i<4?10:0}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:3}}>
                <span style={{fontFamily:sans,fontSize:13,fontWeight:600,color:"#171717"}}>{step.label}</span>
                <span style={{fontFamily:mono,fontSize:13,fontWeight:900,color:step.color}}>{step.count} <span style={{fontSize:10,fontWeight:400,color:"#a3a3a3"}}>{pct}%</span></span>
              </div>
              <div style={{height:6,background:"#f5f5f5",borderRadius:99,overflow:"hidden"}}>
                <div style={{height:"100%",width:barW+"%",background:step.color,borderRadius:99,transition:"width 0.3s"}}/>
              </div>
            </div>;
          })}
        </div>

        {/* KPI Cards — focused */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(6, 1fr)",gap:10,marginBottom:24}}>
          {[
            ["Total",stats.totalUsers,"#171717"],
            ["Today",stats.activeToday,"#22c55e"],
            ["This Week",stats.activeWeek,"#3b82f6"],
            ["New Today",stats.signupsToday,"#8b5cf6"],
            ["New Week",stats.signupsWeek,"#a855f7"],
            ["Mock Drafts",stats.mockDrafts,"#f59e0b"],
          ].map(([label,val,color])=>(
            <div key={label} style={{background:"#fff",border:"1px solid #e5e5e5",borderRadius:10,padding:"12px 14px",textAlign:"center"}}>
              <div style={{fontFamily:font,fontSize:24,fontWeight:900,color,lineHeight:1}}>{val}</div>
              <div style={{fontFamily:mono,fontSize:7,letterSpacing:1.5,color:"#a3a3a3",textTransform:"uppercase",marginTop:5}}>{label}</div>
            </div>
          ))}
        </div>

        {/* Event Breakdown — compact */}
        <div style={{background:"#fff",border:"1px solid #e5e5e5",borderRadius:12,padding:"16px 20px",marginBottom:24}}>
          <div style={{fontFamily:mono,fontSize:9,letterSpacing:2,color:"#a3a3a3",textTransform:"uppercase",marginBottom:10}}>events</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
            {Object.entries(stats.eventCounts||{}).sort((a,b)=>b[1]-a[1]).map(([evt,count])=>{
              const uu=stats.uniqueEventUsers?.[evt]?.size||0;
              return<div key={evt} style={{padding:"6px 12px",background:"#f9f9f7",borderRadius:6,textAlign:"center",minWidth:80}}>
                <div style={{fontFamily:mono,fontSize:16,fontWeight:900,color:"#171717"}}>{count}<span style={{fontSize:10,fontWeight:400,color:"#a3a3a3",marginLeft:3}}>{uu}u</span></div>
                <div style={{fontFamily:mono,fontSize:8,color:"#a3a3a3"}}>{evt.replace(/_/g,' ')}</div>
              </div>;
            })}
          </div>
        </div>

        {/* Positions Ranked — compact row */}
        <div style={{background:"#fff",border:"1px solid #e5e5e5",borderRadius:12,padding:"16px 20px",marginBottom:24}}>
          <div style={{fontFamily:mono,fontSize:9,letterSpacing:2,color:"#a3a3a3",textTransform:"uppercase",marginBottom:10}}>positions ranked</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
            {POSITION_GROUPS.map(pos=>{
              const full=stats.posStats[pos]||0;
              const partial=stats.partialCount[pos]||0;
              const c=POS_COLORS[pos];
              return<div key={pos} style={{textAlign:"center",padding:"6px 10px",background:`${c}08`,borderRadius:6,minWidth:60}}>
                <div style={{fontFamily:font,fontSize:14,fontWeight:900,color:c}}>{pos}</div>
                <div style={{fontFamily:mono,fontSize:14,fontWeight:900,color:"#171717"}}>{full}{partial>0&&<span style={{fontSize:10,color:"#ca8a04"}}>+{partial}</span>}</div>
              </div>;
            })}
          </div>
        </div>

        {/* Users Table */}
        <div style={{background:"#fff",border:"1px solid #e5e5e5",borderRadius:12,overflow:"hidden",marginBottom:24}}>
          <div style={{padding:"14px 16px",borderBottom:"1px solid #f0f0f0",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <span style={{fontFamily:font,fontSize:18,fontWeight:900,color:"#171717"}}>users ({users.length})</span>
            <span style={{fontFamily:mono,fontSize:9,color:"#a3a3a3"}}>{users.filter(u=>u.rankedPositions>0).length} engaged · {users.filter(u=>!u.hasBoard).length} bounced</span>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 70px 70px 70px 90px 90px",gap:4,padding:"8px 16px",background:"#f9f9f7",borderBottom:"1px solid #e5e5e5"}}>
            {["Email","Status","Ranked","Events","Signed Up","Last Active"].map(h=><span key={h} style={{fontFamily:mono,fontSize:8,letterSpacing:1,color:"#a3a3a3",textTransform:"uppercase"}}>{h}</span>)}
          </div>
          <div style={{maxHeight:500,overflowY:"auto"}}>
            {users.map((u,i)=>{
              const tag=tagUser(u);
              return<div key={u.userId} style={{display:"grid",gridTemplateColumns:"1fr 70px 70px 70px 90px 90px",gap:4,padding:"7px 16px",borderBottom:i<users.length-1?"1px solid #f8f8f6":"none",alignItems:"center"}}>
                <span style={{fontFamily:mono,fontSize:10,color:"#525252",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{u.email||u.userId.slice(0,12)+'…'}</span>
                <span style={{fontFamily:mono,fontSize:8,fontWeight:700,color:tag.color,background:tag.bg,padding:"2px 6px",borderRadius:4,textAlign:"center"}}>{tag.label}</span>
                <span style={{fontFamily:mono,fontSize:11,fontWeight:700,color:u.rankedPositions>0?"#22c55e":"#e5e5e5",textAlign:"center"}}>{u.rankedPositions}/{POSITION_GROUPS.length}</span>
                <span style={{fontFamily:mono,fontSize:11,color:u.eventCount>0?"#3b82f6":"#e5e5e5",textAlign:"center"}}>{u.eventCount}</span>
                <span style={{fontFamily:mono,fontSize:9,color:"#a3a3a3"}}>{u.createdAt?new Date(u.createdAt).toLocaleDateString('en-US',{month:'short',day:'numeric'}):""}</span>
                <span style={{fontFamily:mono,fontSize:9,color:"#a3a3a3"}}>{u.updatedAt?new Date(u.updatedAt).toLocaleDateString('en-US',{month:'short',day:'numeric'})+" "+new Date(u.updatedAt).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"}):""}</span>
              </div>;
            })}
          </div>
        </div>

        {/* Recent Events — compact log */}
        <div style={{background:"#fff",border:"1px solid #e5e5e5",borderRadius:12,overflow:"hidden"}}>
          <div style={{padding:"14px 16px",borderBottom:"1px solid #f0f0f0"}}>
            <span style={{fontFamily:font,fontSize:18,fontWeight:900,color:"#171717"}}>recent events</span>
          </div>
          <div style={{maxHeight:350,overflowY:"auto"}}>
            {events.map((e,i)=>{
              const evtColor=e.event==='signup'?"#22c55e":e.event==='mock_draft_started'?"#f59e0b":e.event==='ranking_completed'?"#3b82f6":e.event==='ranking_started'?"#8b5cf6":"#a3a3a3";
              // Find email for this user
              const eu=users.find(u=>u.userId===e.user_id);
              return<div key={e.id} style={{display:"grid",gridTemplateColumns:"110px 1fr 1fr 120px",gap:6,padding:"5px 16px",borderBottom:i<events.length-1?"1px solid #fafaf8":"none",fontSize:10,fontFamily:mono,alignItems:"center"}}>
                <span style={{color:evtColor,fontWeight:700}}>{e.event.replace(/_/g,' ')}</span>
                <span style={{color:"#525252",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{eu?.email||e.user_id?.slice(0,12)+'…'}</span>
                <span style={{color:"#a3a3a3",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{e.metadata&&Object.keys(e.metadata).length>0?JSON.stringify(e.metadata):""}</span>
                <span style={{color:"#d4d4d4"}}>{new Date(e.created_at).toLocaleDateString('en-US',{month:'short',day:'numeric'})} {new Date(e.created_at).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}</span>
              </div>;
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Root App: handles auth state
// ============================================================
export default function App(){
  const[user,setUser]=useState(null);
  const[loading,setLoading]=useState(true);
  const[showAdmin,setShowAdmin]=useState(()=>window.location.hash==="#admin");

  useEffect(()=>{
    const onHash=()=>setShowAdmin(window.location.hash==="#admin");
    window.addEventListener("hashchange",onHash);
    return()=>window.removeEventListener("hashchange",onHash);
  },[]);

  useEffect(()=>{
    supabase.auth.getSession().then(({data:{session}})=>{
      setUser(session?.user||null);
      if(session?.user)trackEvent(session.user.id,'session_return');
      setLoading(false);
    });
    const{data:{subscription}}=supabase.auth.onAuthStateChange((event,session)=>{
      setUser(session?.user||null);
      if(session?.user&&event==='SIGNED_IN')trackEvent(session.user.id,'signup');
    });
    return()=>subscription.unsubscribe();
  },[]);

  const signOut=async()=>{await supabase.auth.signOut();setUser(null);};

  if(loading)return<div style={{minHeight:"100vh",background:"#faf9f6",display:"flex",alignItems:"center",justifyContent:"center"}}><p style={{fontFamily:"'DM Sans',sans-serif",fontSize:14,color:"#a3a3a3"}}>loading...</p></div>;
  if(!user)return<AuthScreen/>;
  if(showAdmin&&ADMIN_EMAILS.includes(user.email))return<AdminDashboard user={user} onBack={()=>{window.location.hash="";setShowAdmin(false);}}/>;
  return<DraftBoard user={user} onSignOut={signOut}/>;
}
