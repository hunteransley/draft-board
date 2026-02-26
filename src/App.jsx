import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { supabase } from "./supabase.js";
import MockDraftSim from "./MockDraftSim.jsx";
import { CONSENSUS_BOARD, getConsensusRank, getConsensusGrade, TEAM_NEEDS_DETAILED } from "./consensusData.js";
import { getProspectStats } from "./prospectStats.js";
import { getStatBasedTraits } from "./statTraits.js";
import { getScoutingTraits } from "./scoutingData.js";
import { getCombineData, formatHeight } from "./combineData.js";

// Suffix-aware short name: "Rueben Bain Jr." → "Bain Jr." not "Jr."
const GEN_SUFFIXES=/^(Jr\.?|Sr\.?|II|III|IV|V|VI|VII|VIII)$/i;
function shortName(name){const p=name.split(" ");const last=p.pop()||"";return GEN_SUFFIXES.test(last)?(p.pop()||last)+" "+last:last;}

if(!window.__bbl_session){
  window.__bbl_session='anon_'+Math.random().toString(36).substr(2,9)+'_'+Date.now();
}

// Fire-and-forget event tracking — never blocks UI, silently drops on error
function trackEvent(userId,event,metadata={}){
  try{supabase.from('events').insert({user_id:userId||null,event,metadata,session_id:window.__bbl_session||null}).then();}catch(e){}
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
const POSITION_TRAITS={QB:["Arm Strength","Accuracy","Pocket Presence","Mobility","Decision Making","Leadership"],RB:["Vision","Contact Balance","Power","Elusiveness","Pass Catching","Speed"],WR:["Route Running","Separation","Hands","YAC Ability","Speed","Contested Catches"],TE:["Receiving","Route Running","Blocking","Athleticism","Hands","Speed"],OT:["Pass Protection","Run Blocking","Footwork","Anchor","Athleticism","Strength"],IOL:["Pass Protection","Run Blocking","Pulling","Strength","Anchor","Versatility"],EDGE:["Pass Rush","Bend","First Step","Power","Motor","Run Defense"],DL:["Pass Rush","Run Defense","First Step","Hand Usage","Motor","Strength"],LB:["Tackling","Coverage","Pass Rush","Instincts","Athleticism","Range"],CB:["Man Coverage","Ball Skills","Zone Coverage","Speed","Press","Nickel"],S:["Man Coverage","Range","Ball Skills","Tackling","Speed","Nickel"],"K/P":["Leg Strength","Accuracy","Consistency","Clutch","Directional Control","Hang Time"]};
const TRAIT_EMOJI={"Arm Strength":"💪","Accuracy":"🎯","Pocket Presence":"🧊","Mobility":"🏃","Decision Making":"🧠","Leadership":"👑","Vision":"👁️","Contact Balance":"⚖️","Power":"🦬","Elusiveness":"💨","Pass Catching":"🧤","Route Running":"🔄","Separation":"🔓","Hands":"🤲","YAC Ability":"🔥","Speed":"🏎️","Contested Catches":"🏈","Receiving":"📡","Blocking":"🧱","Athleticism":"🦅","Versatility":"🔄","Run Blocking":"🏗️","Footwork":"👟","Anchor":"⚓","Pulling":"🚂","Strength":"🏋️","Pass Rush":"🚀","Bend":"🐍","First Step":"⚡","Hand Usage":"🤚","Motor":"🔥","Run Defense":"🧱","Tackling":"💥","Coverage":"🪂","Man Coverage":"👤","Zone Coverage":"🗺️","Nickel":"🔁","Instincts":"🧠","Range":"📡","Ball Skills":"🧲","Press":"✋","Leg Strength":"🦵","Consistency":"📊","Clutch":"❄️","Directional Control":"🧭","Hang Time":"⏱️","Pass Protection":"🛡️"};
const TRAIT_ABBREV={"Arm Strength":"ARM","Accuracy":"ACC","Pocket Presence":"PKT","Mobility":"MOB","Decision Making":"DM","Leadership":"LDR","Vision":"VIS","Contact Balance":"BAL","Power":"PWR","Elusiveness":"ELUS","Pass Catching":"RCV","Speed":"SPD","Route Running":"RR","Separation":"SEP","Hands":"HND","YAC Ability":"YAC","Contested Catches":"CC","Receiving":"RCV","Blocking":"BLK","Athleticism":"ATH","Versatility":"VRS","Run Blocking":"RBK","Footwork":"FT","Anchor":"ANC","Pulling":"PUL","Strength":"STR","Pass Rush":"PR","Bend":"BND","First Step":"1ST","Hand Usage":"HND","Motor":"MTR","Run Defense":"RD","Tackling":"TKL","Coverage":"COV","Man Coverage":"MAN","Zone Coverage":"ZON","Nickel":"NIC","Instincts":"IQ","Range":"RNG","Ball Skills":"BALL","Press":"PRS","Pass Protection":"PP","Leg Strength":"LEG","Consistency":"CON","Clutch":"CLU","Directional Control":"DIR","Hang Time":"HNG"};
const TRAIT_SHORT={"Contested Catches":"Contested","Man Coverage":"Man Cov","Contact Balance":"Contact Bal","Directional Control":"Directional","Decision Making":"Decision","Pocket Presence":"Pocket Pres","Pass Catching":"Pass Catch","Run Blocking":"Run Block","Pass Protection":"Pass Prot","Hand Usage":"Hand Use","Run Defense":"Run Def","Zone Coverage":"Zone Cov","Leg Strength":"Leg Str"};
const TRAIT_WEIGHTS={QB:{"Accuracy":.25,"Decision Making":.22,"Pocket Presence":.18,"Arm Strength":.15,"Leadership":.12,"Mobility":.08},RB:{"Vision":.22,"Elusiveness":.20,"Contact Balance":.18,"Power":.15,"Pass Catching":.13,"Speed":.12},WR:{"Route Running":.22,"Separation":.20,"Hands":.18,"Speed":.16,"YAC Ability":.13,"Contested Catches":.11},TE:{"Receiving":.20,"Blocking":.20,"Route Running":.18,"Hands":.16,"Athleticism":.14,"Speed":.12},OT:{"Pass Protection":.25,"Footwork":.20,"Anchor":.18,"Run Blocking":.15,"Athleticism":.12,"Strength":.10},IOL:{"Run Blocking":.22,"Pass Protection":.22,"Strength":.18,"Pulling":.14,"Anchor":.13,"Versatility":.11},EDGE:{"Pass Rush":.24,"First Step":.20,"Bend":.18,"Power":.15,"Motor":.13,"Run Defense":.10},DL:{"Run Defense":.22,"Pass Rush":.20,"First Step":.18,"Hand Usage":.16,"Motor":.14,"Strength":.10},LB:{"Instincts":.22,"Tackling":.20,"Coverage":.18,"Athleticism":.15,"Pass Rush":.13,"Range":.12},CB:{"Man Coverage":.24,"Ball Skills":.20,"Speed":.18,"Press":.15,"Zone Coverage":.13,"Nickel":.10},S:{"Man Coverage":.22,"Range":.20,"Ball Skills":.18,"Tackling":.16,"Speed":.14,"Nickel":.10},"K/P":{"Accuracy":.25,"Leg Strength":.22,"Consistency":.20,"Clutch":.13,"Directional Control":.12,"Hang Time":.08}};
const TRAIT_TEACHABILITY={"Arm Strength":.1,"Accuracy":.7,"Pocket Presence":.6,"Mobility":.1,"Decision Making":.65,"Leadership":.5,"Vision":.4,"Contact Balance":.2,"Power":.2,"Elusiveness":.15,"Pass Catching":.6,"Pass Protection":.7,"Route Running":.75,"Separation":.5,"Hands":.5,"YAC Ability":.3,"Speed":.05,"Contested Catches":.4,"Receiving":.6,"Blocking":.7,"Athleticism":.05,"Versatility":.3,"Run Blocking":.7,"Footwork":.65,"Anchor":.3,"Pulling":.6,"Strength":.2,"Pass Rush":.4,"Bend":.15,"First Step":.1,"Hand Usage":.65,"Motor":.2,"Run Defense":.6,"Tackling":.6,"Coverage":.5,"Man Coverage":.5,"Zone Coverage":.5,"Nickel":.45,"Instincts":.35,"Range":.1,"Ball Skills":.3,"Press":.55,"Leg Strength":.1,"Consistency":.5,"Clutch":.3,"Directional Control":.6,"Hang Time":.2};
const POSITION_GROUPS=["QB","RB","WR","TE","OT","IOL","EDGE","DL","LB","CB","S","K/P"];
const POS_EMOJI={QB:"🎯",RB:"🏃",WR:"🧤",TE:"🦾",OT:"🛡️",IOL:"🧱",EDGE:"🌪️",DL:"🦬",LB:"💥",CB:"🏝️",S:"🦅","K/P":"🦵"};
const POS_COLORS={QB:"#1e3a5f",RB:"#5b21b6",WR:"#0d9488",TE:"#0891b2",OT:"#b45309",IOL:"#d97706",OL:"#b45309",EDGE:"#15803d",DL:"#166534",LB:"#4338ca",CB:"#0f766e",S:"#047857",DB:"#0f766e","K/P":"#78716c"};
const SCHOOL_CONFERENCE={"Alabama":"SEC","Arizona":"Big 12","Arizona State":"Big 12","Arkansas":"SEC","Auburn":"SEC","Baylor":"Big 12","Boise State":"MWC","Boston College":"ACC","Buffalo":"MAC","BYU":"Big 12","Cal":"Big Ten","California":"Big Ten","Central Michigan":"MAC","Cincinnati":"Big 12","Clemson":"ACC","Dartmouth":"Ivy","Duke":"ACC","Florida":"SEC","Florida International":"CUSA","Florida State":"ACC","Georgia":"SEC","Georgia State":"Sun Belt","Georgia Tech":"ACC","Houston":"Big 12","Illinois":"Big Ten","Incarnate Word":"FCS","Indiana":"Big Ten","Iowa":"Big Ten","Iowa State":"Big 12","James Madison":"Sun Belt","John Carroll":"D3","Kansas":"Big 12","Kansas State":"Big 12","Kentucky":"SEC","Louisiana Tech":"CUSA","Louisiana-Lafayette":"Sun Belt","Louisville":"ACC","LSU":"SEC","Maryland":"Big Ten","Memphis":"AAC","Miami":"ACC","Miami (FL)":"ACC","Miami (OH)":"MAC","Michigan":"Big Ten","Michigan State":"Big Ten","Minnesota":"Big Ten","Mississippi":"SEC","Mississippi State":"SEC","Missouri":"SEC","Montana":"FCS","N.C. State":"ACC","NC State":"ACC","Navy":"AAC","Nebraska":"Big Ten","New Mexico":"MWC","North Carolina":"ACC","North Dakota State":"FCS","Northwestern":"Big Ten","Notre Dame":"Ind","Ohio State":"Big Ten","Oklahoma":"SEC","Oregon":"Big Ten","Oregon State":"Pac-12","Penn State":"Big Ten","Pittsburgh":"ACC","Rutgers":"Big Ten","San Diego State":"MWC","Slippery Rock":"D2","SMU":"ACC","South Alabama":"Sun Belt","South Carolina":"SEC","South Carolina State":"FCS","Southeastern Louisiana":"FCS","Southern Miss":"Sun Belt","Stanford":"ACC","Stephen F. Austin":"FCS","Syracuse":"ACC","TCU":"Big 12","Tennessee":"SEC","Texas":"SEC","Texas A&M":"SEC","Texas State":"Sun Belt","Texas Tech":"Big 12","Toledo":"MAC","UCF":"Big 12","UCLA":"Big Ten","UConn":"Ind","USC":"Big Ten","Utah":"Big 12","UTSA":"AAC","Vanderbilt":"SEC","Virginia":"ACC","Virginia Tech":"ACC","Virginia Union":"D2","Wake Forest":"ACC","Washington":"Big Ten","Western Michigan":"MAC","Wisconsin":"Big Ten","Wyoming":"MWC"};
const INITIAL_ELO=1500;
const BBL_LOGO_B64="data:image/png;base64,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993WusbZohb7HSPJo6Fjiee3xJD+8/H0A4HqYxqJpqiZ008r5ZHHLnvcXEn3JXWkae+qTyyEpZCIisIhSDslutqDa3UDq62BtXQVGG1lDK4hkwHmCP2XDyPPuCo+RYaUlhhPBfG33HZHfuOJzar9E6jDct6XCmrWH0BOWy8/P6d1kTpzfPQIMOmr5Q6xtDP2aa5tImA9AeoH5API9vJfn8xzmODmOLXDsQcEKTdA787n6NYynoNRy11EztSXEfaI8egLvvNHs1wUEpwWI7r0ZNT9SzlfuZQh5p9zNlqunkHDpY6JtREfclwGB9SvCNZ+GepJE1gjopPNgt8keD/owFptg8Ytxw2LUui6KpZj7z6OoLP+h4d/NbPD4pdqa5w/SWiq6MnuX0kEmPz5UNT40tfDJqSPczVfhlpf1rLLS1JHID7fJL+TsrIUW9GjKICn0DtrdLhM44jFNbmwxk+WXAEj8FjH+J3ZikYHUmk6x7/RlthYR+JWE1B4wrNBD06X0LMZP4qudsTfwYDn8Qj/AMrfyxqXqb5XUe9W6MBt92jodEafm4nZGS+plYe7Scknj06QfPK1HxMaw0rtrs8NotLVYqa+eL4EzBIHPgjc7re+QjgPeT+z/iPsoT154kt0NVRSUsd1isVG8YdFbGGJxHvISX/gQD6KH5pZZ5nzTSPkkeepz3uyXH1JPdSxKeNWyXZEJSzwfCIitIBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAf//Z";
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
// Trait value lookup: user traits → scouting → stat-derived → 50
function tv(userTraits,id,trait,name,school){return userTraits[id]?.[trait]??getScoutingTraits(name,school)?.[trait]??getStatBasedTraits(name,school)?.[trait]??50;}

// ============================================================
function SchoolLogo({school,size=32}){const[err,setErr]=useState(false);const url=schoolLogo(school);if(!url||err)return<div style={{width:size,height:size,borderRadius:"50%",background:"#f0f0f0",display:"flex",alignItems:"center",justifyContent:"center",fontSize:size*0.4,fontWeight:700,color:"#a3a3a3",flexShrink:0,fontFamily:"system-ui"}}>{school.charAt(0)}</div>;return<img src={url} alt={school} width={size} height={size} onError={()=>setErr(true)} style={{objectFit:"contain",flexShrink:0}}/>;}

function RadarChart({traits,values,color,size=180}){const cx=size/2,cy=size/2,r=size/2-24,n=traits.length;const K=1.8;const curve=(v)=>Math.pow(v/100,K)*100;const FLOOR=curve(40);const angles=traits.map((_,i)=>(Math.PI*2*i)/n-Math.PI/2);const pv=angles.map((a,i)=>{const raw=values[i]||50;const v=Math.max(0,(curve(raw)-FLOOR)/(100-FLOOR));return[cx+r*v*Math.cos(a),cy+r*v*Math.sin(a)];});return(<svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>{[50,60,70,80,90,100].map(lv=>{const frac=Math.max(0,(curve(lv)-FLOOR)/(100-FLOOR));return<polygon key={lv} points={angles.map(a=>`${cx+r*frac*Math.cos(a)},${cy+r*frac*Math.sin(a)}`).join(" ")} fill="none" stroke={lv===70?"#d4d4d4":"#e5e5e5"} strokeWidth={lv===70?"0.8":"0.5"}/>;})}{angles.map((a,i)=><line key={i} x1={cx} y1={cy} x2={cx+r*Math.cos(a)} y2={cy+r*Math.sin(a)} stroke="#e5e5e5" strokeWidth="0.5"/>)}<polygon points={pv.map(p=>p.join(",")).join(" ")} fill={`${color}18`} stroke={color} strokeWidth="2"/>{pv.map((p,i)=><circle key={i} cx={p[0]} cy={p[1]} r="3" fill={color}/>)}{traits.map((t,i)=>{const lr=r+14;return<text key={t} x={cx+lr*Math.cos(angles[i])} y={cy+lr*Math.sin(angles[i])} textAnchor="middle" dominantBaseline="middle" style={{fontSize:"8px",fill:"#737373",fontFamily:"monospace"}}>{t.split(" ").map(w=>w[0]).join("")}</text>;})}</svg>);}

function MiniRadar({values,color,size=28}){const cx=size/2,cy=size/2,r=size/2-1,n=values.length;if(n<3)return null;const K=1.8;const curve=(v)=>Math.pow(v/100,K)*100;const FLOOR=curve(40);const angles=values.map((_,i)=>(Math.PI*2*i)/n-Math.PI/2);const pts=angles.map((a,i)=>{const v=Math.max(0,(curve(values[i]||50)-FLOOR)/(100-FLOOR));return`${cx+r*v*Math.cos(a)},${cy+r*v*Math.sin(a)}`;}).join(" ");return<svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="mini-radar" style={{flexShrink:0}}><polygon points={angles.map(a=>`${cx+r*Math.cos(a)},${cy+r*Math.sin(a)}`).join(" ")} fill="none" stroke="#e5e5e5" strokeWidth="0.5"/><polygon points={pts} fill={`${color}20`} stroke={color} strokeWidth="1.2"/></svg>;}

function getSimilarPlayers(player,allProspects,traits,count=5){
  const pos=player.gpos||player.pos;const posTraits=POSITION_TRAITS[pos]||POSITION_TRAITS[player.pos]||[];
  const myVals=posTraits.map(t=>tv(traits,player.id,t,player.name,player.school));
  const others=allProspects.filter(p=>(p.gpos||p.pos)===(player.gpos||player.pos)&&p.id!==player.id);
  const scored=others.map(p=>{
    const vals=posTraits.map(t=>tv(traits,p.id,t,p.name,p.school));
    const dist=Math.sqrt(posTraits.reduce((sum,_,i)=>sum+Math.pow(myVals[i]-vals[i],2),0));
    return{player:p,distance:dist};
  });
  scored.sort((a,b)=>a.distance-b.distance);
  return scored.slice(0,count);
}

function PlayerProfile({player,traits,setTraits,notes,setNotes,allProspects,getGrade,onClose,onSelectPlayer,consensus,ratings,isGuest,onRequireAuth}){
  const[isOpen,setIsOpen]=useState(false);
  useEffect(()=>{setTimeout(()=>setIsOpen(true),10);return()=>setIsOpen(false);},[player.id]);
  const handleClose=()=>{setIsOpen(false);setTimeout(onClose,300);};
  const c=POS_COLORS[player.gpos||player.pos]||POS_COLORS[player.pos];
  const posTraits=POSITION_TRAITS[player.gpos||player.pos]||POSITION_TRAITS[player.pos]||[];
  const ps=getProspectStats(player.name,player.school);
  const cd=getCombineData(player.name,player.school);
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
          {(ps.height||ps.weight||ps.cls||cd)&&<div style={{display:"flex",justifyContent:"center",gap:12,marginBottom:8,flexWrap:"wrap"}}>
            {[(cd?.height?{label:"HT",val:formatHeight(cd.height)}:ps.height&&{label:"HT",val:ps.height}),(cd?.weight?{label:"WT",val:cd.weight+" lbs"}:ps.weight&&{label:"WT",val:ps.weight+" lbs"}),ps.cls&&{label:"YR",val:ps.cls}].filter(Boolean).map(({label,val})=>(
              <div key={label} style={{textAlign:"center",background:"#fff",border:"1px solid #e5e5e5",borderRadius:8,padding:"6px 12px",minWidth:60}}>
                <div style={{fontFamily:mono,fontSize:8,letterSpacing:1.5,color:"#a3a3a3",textTransform:"uppercase",marginBottom:2}}>{label}</div>
                <div style={{fontFamily:mono,fontSize:13,fontWeight:700,color:"#171717"}}>{val}</div>
              </div>
            ))}
          </div>}
          {cd&&(()=>{const drills=[cd.forty&&{label:"40",val:cd.forty+"s"},cd.vertical&&{label:"VJ",val:cd.vertical+'"'},cd.broad&&{label:"BJ",val:cd.broad+'"'},cd.bench&&{label:"BP",val:cd.bench},cd.cone&&{label:"3C",val:cd.cone+"s"},cd.shuttle&&{label:"SH",val:cd.shuttle+"s"}].filter(Boolean);return drills.length>0&&<div style={{display:"flex",justifyContent:"center",gap:8,marginBottom:8,flexWrap:"wrap"}}>
            {drills.map(({label,val})=>(
              <div key={label} style={{textAlign:"center",background:"#eff6ff",border:"1px solid #bfdbfe",borderRadius:8,padding:"6px 10px",minWidth:48}}>
                <div style={{fontFamily:mono,fontSize:8,letterSpacing:1.5,color:"#6b9bd2",textTransform:"uppercase",marginBottom:2}}>{label}</div>
                <div style={{fontFamily:mono,fontSize:13,fontWeight:700,color:"#1e40af"}}>{val}</div>
              </div>
            ))}
          </div>;})()}
          {ps.statLine&&<div style={{background:"#f9f9f6",border:"1px solid #f0f0f0",borderRadius:8,padding:"10px 14px",textAlign:"center"}}>
            <div style={{fontFamily:mono,fontSize:12,color:"#525252",lineHeight:1.4}}>{ps.statLine}</div>
            {ps.statExtra&&<div style={{fontFamily:mono,fontSize:11,color:"#a3a3a3",marginTop:4,lineHeight:1.4}}>{ps.statExtra}</div>}
          </div>}
        </div>}

        <div style={{padding:"24px",display:"flex",justifyContent:"center"}}>
          <RadarChart traits={posTraits} values={posTraits.map(t=>tv(traits,player.id,t,player.name,player.school))} color={c} size={200}/>
        </div>

        <div style={{padding:"0 24px 16px"}}>
          {(()=>{const ceil=traits[player.id]?.__ceiling||getScoutingTraits(player.name,player.school)?.__ceiling||"normal";const tiers=[
            {key:"capped",icon:"🔒",label:"Capped",desc:"What you see is what you get",bg:"linear-gradient(135deg, #1e1e1e, #2d2d2d)",border:"#404040",glow:"rgba(100,100,100,.3)",text:"#a3a3a3"},
            {key:"normal",icon:"📊",label:"Normal",desc:"Standard projection",bg:"linear-gradient(135deg, #1a1a2e, #16213e)",border:"#334155",glow:"rgba(99,102,241,.25)",text:"#94a3b8"},
            {key:"high",icon:"🔥",label:"High",desc:"The tools are there",bg:"linear-gradient(135deg, #312e1c, #3d2e0a)",border:"#854d0e",glow:"rgba(234,179,8,.3)",text:"#fbbf24"},
            {key:"elite",icon:"⭐",label:"Elite",desc:"Generational upside",bg:"linear-gradient(135deg, #1a0a2e, #2d1248)",border:"#7c3aed",glow:"rgba(139,92,246,.35)",text:"#a78bfa"}
          ];return(
            <div style={{marginBottom:20,paddingBottom:18,borderBottom:"1px solid #f0f0f0"}}>
              <div style={{fontFamily:mono,fontSize:10,letterSpacing:2,color:"#a3a3a3",textTransform:"uppercase",marginBottom:10}}>ceiling</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:6}}>
                {tiers.map(t=>{const sel=ceil===t.key;return(
                  <button key={t.key} onClick={()=>{if(isGuest){onRequireAuth("want to edit traits and lock in your grades?");return;}setTraits(prev=>({...prev,[player.id]:{...prev[player.id],__ceiling:t.key}}));}}
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
          {posTraits.map(trait=>{const val=tv(traits,player.id,trait,player.name,player.school);const emoji=TRAIT_EMOJI[trait]||"";const t=val/100;const r=Math.round(236+(124-236)*t);const g=Math.round(72+(58-72)*t);const b=Math.round(153+(237-153)*t);const barColor=`rgb(${r},${g},${b})`;return(
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
                  onChange={e=>{if(isGuest){onRequireAuth("want to edit traits and lock in your grades?");return;}setTraits(prev=>{const existing=prev[player.id]||{};if(!existing.__ceiling){const sc=getScoutingTraits(player.name,player.school);if(sc?.__ceiling)existing.__ceiling=sc.__ceiling;}return{...prev,[player.id]:{...existing,[trait]:parseInt(e.target.value)}};});}}
                  style={{position:"absolute",left:0,width:"100%",height:24,background:"transparent",cursor:isGuest?"default":"pointer",zIndex:4,opacity:0,margin:0}}/>
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
            readOnly={isGuest}
            placeholder="Add your scouting notes..."
            style={{width:"100%",minHeight:80,fontFamily:sans,fontSize:13,padding:"10px 12px",border:"1px solid #e5e5e5",borderRadius:8,background:"#fff",color:"#171717",resize:"vertical",outline:"none",lineHeight:1.5,boxSizing:"border-box"}}
            onFocus={e=>{if(isGuest){onRequireAuth("want to save scouting notes?");e.target.blur();return;}e.target.style.borderColor=c;}} onBlur={e=>e.target.style.borderColor="#e5e5e5"}/>
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
// Auth Modal (contextual sign-in prompt for guests)
// ============================================================
function AuthModal({message,onClose}){
  const[error,setError]=useState('');
  const handleGoogle=async()=>{
    const{error:err}=await supabase.auth.signInWithOAuth({provider:'google',options:{redirectTo:window.location.origin}});
    if(err)setError(err.message);
  };
  return(
    <>
      <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:500}}/>
      <div style={{position:"fixed",top:"50%",left:"50%",transform:"translate(-50%,-50%)",zIndex:501,background:"#faf9f6",borderRadius:16,padding:window.innerWidth<480?"24px 16px 20px":"32px 28px 28px",width:"calc(100vw - 32px)",maxWidth:400,boxShadow:"0 20px 60px rgba(0,0,0,0.25)",textAlign:"center"}}>
        <button onClick={onClose} style={{position:"absolute",top:12,right:12,fontFamily:sans,fontSize:16,color:"#a3a3a3",background:"none",border:"none",cursor:"pointer"}}>✕</button>
        <img src="/logo.png" alt="Big Board Lab" style={{width:window.innerWidth<480?48:64,height:"auto",marginBottom:10}}/>
        <p style={{fontFamily:mono,fontSize:window.innerWidth<480?8:10,letterSpacing:3,color:"#a3a3a3",textTransform:"uppercase",margin:"0 0 6px"}}>2026 NFL Draft</p>
        <h2 style={{fontFamily:font,fontSize:window.innerWidth<480?22:28,fontWeight:900,lineHeight:0.95,color:"#171717",margin:"0 0 8px",letterSpacing:-1.5}}>big board lab</h2>
        <p style={{fontFamily:sans,fontSize:window.innerWidth<480?12:14,color:"#525252",lineHeight:1.4,margin:"0 0 16px"}}>{message}</p>
        <div style={{background:"#fff",border:"1px solid #e5e5e5",borderRadius:12,padding:window.innerWidth<480?"14px 14px 12px":"20px 20px 16px"}}>
          <button onClick={handleGoogle}
            style={{width:"100%",fontFamily:sans,fontSize:window.innerWidth<480?12:14,fontWeight:700,padding:window.innerWidth<480?"10px":"14px",background:"#fff",color:"#171717",border:"1px solid #e5e5e5",borderRadius:99,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8,transition:"background 0.15s"}}
            onMouseEnter={e=>e.currentTarget.style.background="#f5f5f5"} onMouseLeave={e=>e.currentTarget.style.background="#fff"}>
            <svg width="18" height="18" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
            continue with Google
          </button>
          {error&&<p style={{fontFamily:sans,fontSize:12,color:"#dc2626",marginTop:8,marginBottom:0,textAlign:"center"}}>{error}</p>}
          <p style={{fontFamily:sans,fontSize:11,color:"#a3a3a3",margin:"10px 0 0"}}>free to use · no credit card required</p>
        </div>
      </div>
    </>
  );
}

// ============================================================
// Auth Screen
// ============================================================
function AuthScreen({onSignIn,onSkip,onOpenGuide}){
  const[error,setError]=useState('');
  const seedTicker=[
    // Risers (20)
    {name:"Carson Beck",pos:"QB",delta:3.4},{name:"Garrett Nussmeier",pos:"QB",delta:2.1},{name:"Carnell Tate",pos:"WR",delta:2.8},
    {name:"Jordyn Tyson",pos:"WR",delta:1.7},{name:"Denzel Boston",pos:"WR",delta:2.3},{name:"Kenyon Sadiq",pos:"TE",delta:1.9},
    {name:"Spencer Fano",pos:"OL",delta:2.6},{name:"Francis Mauigoa",pos:"OL",delta:1.4},{name:"Rueben Bain Jr.",pos:"DL",delta:3.1},
    {name:"T.J. Parker",pos:"DL",delta:1.8},{name:"Caleb Downs",pos:"DB",delta:2.5},{name:"Sonny Styles",pos:"LB",delta:1.6},
    {name:"Jeremiyah Love",pos:"RB",delta:2.2},{name:"Makai Lemon",pos:"WR",delta:1.3},{name:"Arvell Reese",pos:"LB",delta:1.9},
    {name:"Mansoor Delane",pos:"DB",delta:2.4},{name:"KC Concepcion",pos:"WR",delta:1.5},{name:"Eli Stowers",pos:"TE",delta:1.1},
    {name:"Peter Woods",pos:"DL",delta:1.7},{name:"Kadyn Proctor",pos:"OL",delta:1.2},
    // Fallers (20)
    {name:"Drew Allar",pos:"QB",delta:-2.9},{name:"Cade Klubnik",pos:"QB",delta:-1.7},{name:"Dillon Gabriel",pos:"QB",delta:-2.3},
    {name:"Avieon Terrell",pos:"DB",delta:-1.4},{name:"Blake Miller",pos:"OL",delta:-1.8},{name:"Gracen Halton",pos:"DL",delta:-1.1},
    {name:"Dillon Thieneman",pos:"DB",delta:-1.6},{name:"Harold Perkins Jr.",pos:"LB",delta:-2.1},{name:"Keldric Faulk",pos:"DL",delta:-1.3},
    {name:"Dani Dennis-Sutton",pos:"DL",delta:-1.5},{name:"Anthony Hill Jr.",pos:"LB",delta:-1.9},{name:"Jonah Coleman",pos:"RB",delta:-1.2},
    {name:"Chris Bell",pos:"WR",delta:-2.4},{name:"Omar Cooper Jr.",pos:"WR",delta:-1.1},{name:"Monroe Freeling",pos:"OL",delta:-1.7},
    {name:"CJ Allen",pos:"LB",delta:-1.4},{name:"Davison Igbinosun",pos:"DB",delta:-2.6},{name:"Malik Muhammad",pos:"DB",delta:-1.3},
    {name:"Kamari Ramsey",pos:"DB",delta:-1.8},{name:"Anthony Lucas",pos:"DL",delta:-1.5}
  ];
  const[tickerData,setTickerData]=useState(null);

  useEffect(()=>{
    supabase.from('public_adp').select('*').then(({data})=>{
      if(!data||data.length===0){setTickerData(seedTicker);return;}
      const movers=data.filter(d=>d.avg_pick_7d!=null&&d.avg_pick_prev_7d!=null).map(d=>({
        name:d.prospect_name,pos:d.prospect_pos,
        delta:Math.round((d.avg_pick_prev_7d-d.avg_pick_7d)*10)/10,
        picks:d.times_picked
      })).filter(d=>Math.abs(d.delta)>=1);
      setTickerData(movers.length>=5?movers:seedTicker);
    });
  },[]);

  const handleGoogle=async()=>{
    const{error:err}=await supabase.auth.signInWithOAuth({provider:'google',options:{redirectTo:window.location.origin}});
    if(err)setError(err.message);
  };

  const demoPair=[PROSPECTS.find(p=>p.name==="Rueben Bain Jr."),PROSPECTS.find(p=>p.name==="David Bailey")].filter(Boolean);
  const demoQB=PROSPECTS.find(p=>p.name==="Garrett Nussmeier");
  const demoBoard=[PROSPECTS.find(p=>p.name==="Rueben Bain Jr."),PROSPECTS.find(p=>p.name==="Caleb Downs"),PROSPECTS.find(p=>p.name==="Francis Mauigoa")].filter(Boolean);
  const homeTeams=["Raiders","Jets","Cardinals","Titans","Giants","Browns","Commanders","Saints"];

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
          <button onClick={handleGoogle}
            style={{width:"100%",fontFamily:sans,fontSize:14,fontWeight:700,padding:"14px",background:"#fff",color:"#171717",border:"1px solid #e5e5e5",borderRadius:99,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:10,marginBottom:12,transition:"background 0.15s"}}
            onMouseEnter={e=>e.currentTarget.style.background="#f5f5f5"} onMouseLeave={e=>e.currentTarget.style.background="#fff"}>
            <svg width="18" height="18" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
            continue with Google
          </button>
          {error&&<p style={{fontFamily:sans,fontSize:12,color:"#dc2626",marginBottom:8,textAlign:"center"}}>{error}</p>}
          {onSkip&&<button onClick={onSkip} style={{width:"100%",fontFamily:sans,fontSize:12,color:"#a3a3a3",background:"none",border:"none",cursor:"pointer",textAlign:"center",padding:"8px 0"}}>skip for now →</button>}
          <p style={{fontFamily:sans,fontSize:11,color:"#a3a3a3",margin:"8px 0 0",textAlign:"center"}}>free to use · no credit card required</p>
        </div>
      </div>

      {/* Prospect Stock Ticker — real ADP data from mock drafts */}
      {(()=>{
        const posColors={QB:"#ec4899",RB:"#22c55e",WR:"#7c3aed",TE:"#f97316",OT:"#3b82f6",IOL:"#3b82f6",OL:"#3b82f6",EDGE:"#06b6d4",DL:"#64748b",LB:"#1d4ed8",CB:"#eab308",S:"#eab308",K:"#a3a3a3",P:"#a3a3a3"};
        if(!tickerData)return null;
        const risers=tickerData.filter(d=>d.delta>0).sort((a,b)=>b.delta-a.delta).slice(0,20);
        const fallers=tickerData.filter(d=>d.delta<0).sort((a,b)=>a.delta-b.delta).slice(0,20);
        if(risers.length===0&&fallers.length===0)return null;
        const risersLoop=[...risers,...risers];
        const fallersLoop=[...fallers,...fallers];
        const ps=(d)=>({display:"inline-flex",alignItems:"center",gap:5,padding:"4px 10px",borderRadius:99,flexShrink:0,background:d.delta>0?"rgba(34,197,94,0.08)":"rgba(239,68,68,0.08)",border:`1px solid ${d.delta>0?"rgba(34,197,94,0.15)":"rgba(239,68,68,0.15)"}`});
        return<div style={{maxWidth:780,margin:"0 auto",padding:"0 24px 24px"}}>
          <div style={{overflow:"hidden",borderRadius:12,background:"#fff",border:"1px solid #e5e5e5",padding:"10px 0"}}>
            {risers.length>0&&<div style={{overflow:"hidden",marginBottom:fallers.length>0?6:0}}>
              <div style={{display:"flex",gap:8,animation:"tickerRight 35s linear infinite",width:"max-content"}}>
                {risersLoop.map((d,i)=><div key={`r${i}`} style={ps(d)}>
                  <span style={{fontFamily:mono,fontSize:9,fontWeight:700,color:posColors[d.pos]||"#525252"}}>{d.pos}</span>
                  <span style={{fontFamily:sans,fontSize:11,fontWeight:600,color:"#171717"}}>{shortName(d.name)}</span>
                  <span style={{fontFamily:mono,fontSize:10,fontWeight:700,color:"#22c55e"}}>↑{Math.abs(d.delta)}</span>
                </div>)}
              </div>
            </div>}
            {fallers.length>0&&<div style={{overflow:"hidden"}}>
              <div style={{display:"flex",gap:8,animation:"tickerLeft 40s linear infinite",width:"max-content"}}>
                {fallersLoop.map((d,i)=><div key={`f${i}`} style={ps(d)}>
                  <span style={{fontFamily:mono,fontSize:9,fontWeight:700,color:posColors[d.pos]||"#525252"}}>{d.pos}</span>
                  <span style={{fontFamily:sans,fontSize:11,fontWeight:600,color:"#171717"}}>{shortName(d.name)}</span>
                  <span style={{fontFamily:mono,fontSize:10,fontWeight:700,color:"#ef4444"}}>↓{Math.abs(d.delta)}</span>
                </div>)}
              </div>
            </div>}
            <style>{`
              .trait-pills-scroll::-webkit-scrollbar{display:none;}
              @keyframes tickerRight{0%{transform:translateX(-50%)}100%{transform:translateX(0%)}}
              @keyframes tickerLeft{0%{transform:translateX(0%)}100%{transform:translateX(-50%)}}
            `}</style>
          </div>
        </div>;
      })()}

      {/* Features */}
      <div style={{maxWidth:780,margin:"0 auto",padding:"0 24px 40px",display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(280px, 1fr))",gap:12}}>

        {/* 1 — Pair ranking */}
        <div style={{background:"#fff",border:"1px solid #e5e5e5",borderRadius:12,padding:"20px 22px"}}>
          <div style={{marginBottom:12}}>
            <div style={{fontFamily:sans,fontSize:13,fontWeight:700,color:"#171717",marginBottom:4}}>Pair-by-pair prospect ranking</div>
            <div style={{fontFamily:sans,fontSize:12,color:"#737373",lineHeight:1.45}}>Choose between two players, head-to-head, until your board builds itself.</div>
          </div>
          <div style={{display:"flex",gap:8,alignItems:"center",justifyContent:"center"}}>
            {(()=>{const cards=demoPair.map(p=>{const c=POS_COLORS[p.gpos||p.pos];return<div key={p.id} style={{flex:"0 0 auto",background:"#faf9f6",border:`1.5px solid ${c}22`,borderRadius:10,padding:"8px 12px",textAlign:"center",minWidth:0}}>
              <SchoolLogo school={p.school} size={24}/>
              <div style={{fontFamily:sans,fontSize:11,fontWeight:700,color:"#171717",marginTop:4,lineHeight:1.1}}>{shortName(p.name)}</div>
              <span style={{fontFamily:mono,fontSize:8,fontWeight:700,color:c,background:`${c}0d`,padding:"1px 6px",borderRadius:99,display:"inline-block",marginTop:3}}>{p.gpos||p.pos}</span>
            </div>;});return<>{cards[0]}<span style={{fontFamily:font,fontSize:14,fontWeight:900,color:"#d4d4d4"}}>vs</span>{cards[1]}</>;})()}
          </div>
        </div>

        {/* 2 — Trait grading */}
        <div style={{background:"#fff",border:"1px solid #e5e5e5",borderRadius:12,padding:"20px 22px"}}>
          <div style={{marginBottom:12}}>
            <div style={{fontFamily:sans,fontSize:13,fontWeight:700,color:"#171717",marginBottom:4}}>Spider charts & trait grading</div>
            <div style={{fontFamily:sans,fontSize:12,color:"#737373",lineHeight:1.45}}>Dial in traits and watch radar charts and grades update in real time.</div>
          </div>
          {(()=>{if(!demoQB)return null;const pos=demoQB.gpos||demoQB.pos;const posTraits=POSITION_TRAITS[pos]||[];const c=POS_COLORS[pos];const vals=[82,75,68,72,78,65];
            return<div style={{display:"flex",alignItems:"center",gap:8}}>
              <div style={{display:"flex",flexDirection:"column",gap:4,flex:1,minWidth:0}}>
                {posTraits.slice(0,4).map((t,i)=>{const v=vals[i]||60;return<div key={t} style={{display:"flex",alignItems:"center",gap:4}}>
                  <span style={{fontFamily:mono,fontSize:7,fontWeight:600,color:"#a3a3a3",width:24,textAlign:"right",flexShrink:0}}>{TRAIT_ABBREV[t]||t.slice(0,3).toUpperCase()}</span>
                  <div style={{flex:1,height:4,background:"#f0f0f0",borderRadius:99,overflow:"hidden"}}><div style={{width:`${v}%`,height:"100%",background:"linear-gradient(90deg,#ec4899,#7c3aed)",borderRadius:99}}/></div>
                  <span style={{fontFamily:mono,fontSize:7,fontWeight:700,color:"#525252",width:16,textAlign:"right"}}>{v}</span>
                </div>;})}
              </div>
              <RadarChart traits={posTraits} values={vals} color={c} size={90}/>
            </div>;
          })()}
        </div>

        {/* 3 — 32 AI GMs */}
        <div style={{background:"#fff",border:"1px solid #e5e5e5",borderRadius:12,padding:"20px 22px"}}>
          <div style={{marginBottom:12}}>
            <div style={{fontFamily:sans,fontSize:13,fontWeight:700,color:"#171717",marginBottom:4}}>32 AI GMs with real tendencies</div>
            <div style={{fontFamily:sans,fontSize:12,color:"#737373",lineHeight:1.45}}>Each CPU team drafts differently based on real needs and front office style.</div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:6}}>
            {homeTeams.map(t=><div key={t} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:2,padding:4}}>
              <NFLTeamLogo team={t} size={20}/>
              <span style={{fontFamily:mono,fontSize:7,color:"#a3a3a3",fontWeight:600}}>{NFL_TEAM_ABR[t]}</span>
            </div>)}
          </div>
        </div>

        {/* 4 — Depth charts */}
        <div style={{background:"#fff",border:"1px solid #e5e5e5",borderRadius:12,padding:"20px 22px"}}>
          <div style={{marginBottom:12}}>
            <div style={{fontFamily:sans,fontSize:13,fontWeight:700,color:"#171717",marginBottom:4}}>Live depth chart updates</div>
            <div style={{fontFamily:sans,fontSize:12,color:"#737373",lineHeight:1.45}}>Every pick lands on the roster in real time. Watch starters get displaced.</div>
          </div>
          <div style={{borderRadius:8,overflow:"hidden",border:"1px solid #f0f0f0"}}>
            {[{slot:"QB1",name:"F. Mendoza",draft:true},{slot:"EDGE1",name:"K. Mack"},{slot:"CB2",name:"A. Terrell",draft:true}].map((r,i)=><div key={r.slot} style={{display:"flex",alignItems:"center",gap:6,padding:"4px 8px",borderBottom:i<2?"1px solid #f5f5f5":"none",background:r.draft?"rgba(34,197,94,0.04)":"transparent"}}>
              <span style={{fontFamily:mono,fontSize:8,fontWeight:700,color:"#a3a3a3",width:36}}>{r.slot}</span>
              <span style={{fontFamily:sans,fontSize:11,fontWeight:r.draft?600:400,color:r.draft?"#171717":"#737373",flex:1}}>{r.name}</span>
              {r.draft&&<span style={{fontFamily:mono,fontSize:7,fontWeight:700,color:"#22c55e",background:"rgba(34,197,94,0.1)",padding:"1px 6px",borderRadius:99}}>NEW</span>}
            </div>)}
          </div>
        </div>

        {/* 5 — Trait filtering */}
        <div style={{background:"#fff",border:"1px solid #e5e5e5",borderRadius:12,padding:"20px 22px"}}>
          <div style={{marginBottom:12}}>
            <div style={{fontFamily:sans,fontSize:13,fontWeight:700,color:"#171717",marginBottom:4}}>Filter by elite traits</div>
            <div style={{fontFamily:sans,fontSize:12,color:"#737373",lineHeight:1.45}}>Find the best pass rushers, ball hawks, or route runners across every position.</div>
          </div>
          <div style={{display:"flex",flexWrap:"wrap",gap:4,justifyContent:"center",marginBottom:8}}>
            {["Pass Rush","Speed","Man Coverage","Hands"].map(t=><span key={t} style={{fontFamily:sans,fontSize:9,fontWeight:600,color:"#7c3aed",background:"#f5f3ff",border:"1px solid #ede9fe",borderRadius:99,padding:"3px 8px",display:"inline-flex",alignItems:"center",gap:3}}>
              <span style={{fontSize:9}}>{TRAIT_EMOJI[t]}</span>{t}
            </span>)}
          </div>
          <div style={{borderRadius:8,overflow:"hidden",border:"1px solid #f0f0f0"}}>
            {[{name:"Bain Jr.",pos:"EDGE",val:92},{name:"Parker",pos:"EDGE",val:88},{name:"Bailey",pos:"DL",val:85}].map((p,i)=>{const c=POS_COLORS[p.pos];return<div key={p.name} style={{display:"flex",alignItems:"center",gap:6,padding:"4px 8px",borderBottom:i<2?"1px solid #f5f5f5":"none"}}>
              <span style={{fontFamily:mono,fontSize:8,fontWeight:700,color:c,background:`${c}0d`,padding:"1px 6px",borderRadius:99}}>{p.pos}</span>
              <span style={{fontFamily:sans,fontSize:11,fontWeight:600,color:"#171717",flex:1}}>{p.name}</span>
              <span style={{fontFamily:mono,fontSize:10,fontWeight:700,color:"#7c3aed"}}>{p.val}</span>
            </div>;})}
          </div>
        </div>

        {/* 6 — Big board */}
        <div style={{background:"#fff",border:"1px solid #e5e5e5",borderRadius:12,padding:"20px 22px"}}>
          <div style={{marginBottom:12}}>
            <div style={{fontFamily:sans,fontSize:13,fontWeight:700,color:"#171717",marginBottom:4}}>Your board builds itself</div>
            <div style={{fontFamily:sans,fontSize:12,color:"#737373",lineHeight:1.45}}>Rankings, grades, and radar charts — all in one view. Share it with one tap.</div>
          </div>
          <div style={{borderRadius:8,overflow:"hidden",border:"1px solid #f0f0f0"}}>
            {demoBoard.map((p,i)=>{const c=POS_COLORS[p.gpos||p.pos];const posTraits=POSITION_TRAITS[p.gpos||p.pos]||[];const vals=posTraits.map(t=>tv({},p.id,t,p.name,p.school));return<div key={p.id} style={{display:"flex",alignItems:"center",gap:6,padding:"4px 8px",borderBottom:i<demoBoard.length-1?"1px solid #f5f5f5":"none"}}>
              <span style={{fontFamily:mono,fontSize:10,fontWeight:700,color:"#a3a3a3",width:16,textAlign:"right"}}>{i+1}</span>
              <span style={{fontFamily:mono,fontSize:8,fontWeight:700,color:c,background:`${c}0d`,padding:"1px 6px",borderRadius:99}}>{p.gpos||p.pos}</span>
              <SchoolLogo school={p.school} size={16}/>
              <span style={{fontFamily:sans,fontSize:11,fontWeight:600,color:"#171717",flex:1}}>{shortName(p.name)}</span>
              <MiniRadar values={vals} color={c} size={20}/>
            </div>;})}
          </div>
        </div>
      </div>

      {/* Guide CTA */}
      <div style={{textAlign:"center",padding:"0 24px 32px"}}>
        <span onClick={onOpenGuide} style={{fontFamily:sans,fontSize:13,fontWeight:600,color:"#7c3aed",cursor:"pointer",display:"inline-flex",alignItems:"center",gap:6}} onMouseEnter={e=>e.currentTarget.style.textDecoration="underline"} onMouseLeave={e=>e.currentTarget.style.textDecoration="none"}>
          see everything you can do →
        </span>
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
function DraftBoard({user,onSignOut,isGuest,onRequireAuth,onOpenGuide}){
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
  const profileTraitsSnapshot=useRef(null);
  const openProfile=useCallback((p)=>{profileTraitsSnapshot.current=p?JSON.stringify(traits[p.id]||{}):null;setProfilePlayer(p);},[traits]);
  const closeProfile=useCallback(()=>{
    if(profilePlayer){
      const before=profileTraitsSnapshot.current;
      const after=JSON.stringify(traits[profilePlayer.id]||{});
      if(before!==after){
        const gpos=profilePlayer.gpos||profilePlayer.pos;
        const group=(gpos==="K"||gpos==="P"||gpos==="LS")?"K/P":gpos;
        if(!rankedGroups.has(group)){
          setBoardTab("my");
          const toast=document.createElement('div');toast.textContent='saved to your board';
          Object.assign(toast.style,{position:'fixed',bottom:'32px',left:'50%',transform:'translateX(-50%)',background:'#171717',color:'#fff',padding:'10px 24px',borderRadius:'99px',fontSize:'13px',fontWeight:'600',fontFamily:'-apple-system,system-ui,sans-serif',zIndex:'99999',boxShadow:'0 4px 12px rgba(0,0,0,0.15)',transition:'opacity 0.3s'});
          document.body.appendChild(toast);
          setTimeout(()=>{toast.style.opacity='0';setTimeout(()=>toast.remove(),300);},2000);
        }
      }
    }
    setProfilePlayer(null);
  },[profilePlayer,traits,rankedGroups]);
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
  useEffect(()=>{if(showMockDraft)trackEvent(user?.id,'mock_draft_started',{guest:!user});},[showMockDraft]);
  const[boardTab,setBoardTab]=useState("consensus");
  const[boardFilter,setBoardFilter]=useState(new Set());
  const[boardShowAll,setBoardShowAll]=useState(false);
  const[boardTraitFilter,setBoardTraitFilter]=useState(new Set());
  useEffect(()=>{setBoardTraitFilter(new Set());},[boardFilter]);
  useEffect(()=>{if(rankedGroups.size>0)setBoardTab("my");},[rankedGroups.size]);
  const[lockedPlayer,setLockedPlayer]=useState(null);
  const[showOnboarding,setShowOnboarding]=useState(()=>{try{return !localStorage.getItem('bbl_onboarded');}catch(e){return true;}});

  // Consensus rankings derived from consensusData.js CONSENSUS_BOARD (2026 class)
  const CONSENSUS=useMemo(()=>CONSENSUS_BOARD.map((name,i)=>({name,rank:i+1})),[]);

  // Team needs for mock draft
  const TEAM_NEEDS=useMemo(()=>({"Raiders":["QB","WR","CB"],"Jets":["OL","WR","DL"],"Cardinals":["OL","DL","DB"],"Titans":["DL","WR","OL"],"Giants":["WR","OL","QB"],"Browns":["QB","WR","OL"],"Commanders":["DL","OL","DB"],"Saints":["QB","OL","DL"],"Chiefs":["WR","OL","DB"],"Bengals":["OL","DL","DB"],"Dolphins":["QB","OL","DL"],"Cowboys":["DL","DB","OL"],"Rams":["DB","DL","OL"],"Ravens":["DL","WR","OL"],"Buccaneers":["OL","WR","DL"],"Lions":["DL","DB","LB"],"Vikings":["OL","DL","DB"],"Panthers":["DB","LB","DL"],"Steelers":["QB","WR","OL"],"Chargers":["OL","DL","LB"],"Eagles":["DL","LB","DB"],"Bears":["WR","OL","DB"],"Bills":["OL","WR","DL"],"49ers":["WR","DB","DL"],"Texans":["OL","DL","DB"],"Broncos":["OL","WR","DL"],"Patriots":["OL","WR","DL"],"Seahawks":["DL","OL","LB"],"Falcons":["DL","WR","DB"],"Colts":["DL","OL","WR"],"Packers":["DB","OL","DL"],"Jaguars":["DB","LB","OL"]}),[]);

  // Load board from Supabase on mount
  useEffect(()=>{
    if(!user?.id){setPhase("home");return;}
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
  },[user?.id]);

  // Auto-save debounced
  const saveTimer=useRef(null);
  useEffect(()=>{
    if(!user?.id)return;
    if(phase==="loading")return;
    if(saveTimer.current)clearTimeout(saveTimer.current);
    saveTimer.current=setTimeout(async()=>{
      if(rankedGroups.size===0&&Object.keys(ratings).length===0&&!lastSaved)return;
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
  },[ratings,traits,rankedGroups,traitReviewedGroups,compCount,notes,partialProgress,user?.id,phase]);

  const prospectsMap=useMemo(()=>{const m={};PROSPECTS.forEach(p=>m[p.id]=p);return m;},[]);
  const byPos=useMemo(()=>{const m={};const seen=new Set();PROSPECTS.forEach(p=>{if(seen.has(p.id))return;seen.add(p.id);const g=p.gpos||p.pos;const group=(g==="K"||g==="P"||g==="LS")?"K/P":g;if(!m[group])m[group]=[];m[group].push(p);});return m;},[]);
  // Trait thresholds: per-position percentile cutoffs
  const traitThresholds=useMemo(()=>{const result={};Object.entries(POSITION_TRAITS).forEach(([pos,posTraits])=>{const players=byPos[pos]||[];if(!players.length)return;result[pos]={};posTraits.forEach(trait=>{const values=players.map(p=>tv(traits,p.id,trait,p.name,p.school)).sort((a,b)=>a-b);const n=values.length;result[pos][trait]={p80:values[Math.floor(n*0.8)]||50,p90:values[Math.floor(n*0.9)]||50};});});return result;},[traits,byPos]);
  const qualifiesForFilter=useCallback((id,pos,trait)=>{const p=PROSPECTS.find(x=>x.id===id);if(!p)return false;const th=traitThresholds[pos]?.[trait];if(!th)return false;const score=tv(traits,id,trait,p.name,p.school);return score>=th.p80&&score>75;},[traitThresholds,traits]);
  const qualifiesForBadge=useCallback((id,pos,trait)=>{const p=PROSPECTS.find(x=>x.id===id);if(!p)return false;const th=traitThresholds[pos]?.[trait];if(!th)return false;const score=tv(traits,id,trait,p.name,p.school);return score>=th.p90&&score>80;},[traitThresholds,traits]);
  const prospectBadges=useMemo(()=>{const badges={};PROSPECTS.forEach(p=>{const pos=p.gpos||p.pos;const pk=(pos==="K"||pos==="P"||pos==="LS")?"K/P":pos;const posTraits=POSITION_TRAITS[pk]||[];const qualifying=posTraits.filter(trait=>qualifiesForBadge(p.id,pk,trait)).map(trait=>({trait,emoji:TRAIT_EMOJI[trait]||"",score:tv(traits,p.id,trait,p.name,p.school)})).sort((a,b)=>b.score-a.score).slice(0,3);if(qualifying.length>0)badges[p.id]=qualifying;});return badges;},[traits,qualifiesForBadge]);
  const posRankFn=useCallback((id)=>{const p=prospectsMap[id];if(!p)return 999;const ps=getProspectStats(p.name,p.school);return ps?.posRank||getConsensusRank(p.name)||999;},[prospectsMap]);
  const startRanking=useCallback((pos,resume=false)=>{
    setLockedPlayer(null);
    trackEvent(user?.id,'ranking_started',{position:pos,resume,guest:!user});
    const ids=[...new Set((byPos[pos]||[]).map(p=>p.id))];
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
    setActivePos(pos);setPhase("ranking");
  },[ratings,compCount,byPos,partialProgress,prospectsMap,posRankFn]);
  const handlePick=useCallback((winnerId,confidence=0.5)=>{if(!currentMatchup||!activePos)return;const[a,b]=currentMatchup;const aWon=winnerId===a;const k=24+(confidence*24);const{newA,newB}=eloUpdate(ratings[a]||1500,ratings[b]||1500,aWon,k);const ur={...ratings,[a]:newA,[b]:newB};setRatings(ur);const uc={...compCount,[a]:(compCount[a]||0)+1,[b]:(compCount[b]||0)+1};setCompCount(uc);setWinCount(prev=>({...prev,[winnerId]:(prev[winnerId]||0)+1}));const ns=new Set(completed[activePos]);ns.add(`${a}-${b}`);setCompleted(prev=>({...prev,[activePos]:ns}));
    // Save partial progress for resume
    setPartialProgress(prev=>({...prev,[activePos]:{matchups:matchups[activePos]||[],completed:ns,ratings:ur}}));
    const next=getNextMatchup(matchups[activePos],ns,ur,uc,posRankFn,lockedPlayer);if(!next){if(lockedPlayer){setLockedPlayer(null);const nextUnlocked=getNextMatchup(matchups[activePos],ns,ur,uc,posRankFn,null);if(!nextUnlocked)finishRanking(activePos,ur);else setCurrentMatchup(nextUnlocked);}else{finishRanking(activePos,ur);}}else setCurrentMatchup(next);setShowConfidence(false);setPendingWinner(null);},[currentMatchup,activePos,ratings,completed,matchups,compCount,posRankFn,lockedPlayer]);
  const canFinish=useMemo(()=>{if(!activePos||!byPos[activePos])return false;return byPos[activePos].every(p=>(compCount[p.id]||0)>=MIN_COMPS);},[activePos,byPos,compCount]);
  const canSim=useMemo(()=>{if(!activePos)return false;const doneCount=(completed[activePos]||new Set()).size;return doneCount>=20;},[activePos,completed]);
  const simAndFinish=useCallback((pos)=>{
    const ids=[...new Set((byPos[pos]||[]).map(p=>p.id))];
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
  const finishRanking=useCallback((pos)=>{
    setRankedGroups(prev=>new Set([...prev,pos]));
    setPartialProgress(prev=>{const n={...prev};delete n[pos];return n;});
    trackEvent(user?.id,'ranking_completed',{position:pos,guest:!user});
    setPhase("pick-position");
  },[user?.id]);
  const getRanked=useCallback((pos)=>{const seen=new Set();return[...(byPos[pos]||[])].filter(p=>{if(seen.has(p.id))return false;seen.add(p.id);return true;}).sort((a,b)=>(ratings[b.id]||1500)-(ratings[a.id]||1500));},[byPos,ratings]);
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
  // Grade computation: user traits → scouting traits → fallback 50
  const gradeFromTraits=useCallback((traitObj,pos)=>{
    const weights=TRAIT_WEIGHTS[pos]||TRAIT_WEIGHTS["QB"];const posTraits=POSITION_TRAITS[pos]||[];
    let totalW=0,totalV=0;posTraits.forEach(trait=>{const w=weights[trait]||1/posTraits.length;const v=traitObj[trait]||50;totalW+=w;totalV+=v*w;});
    const raw=totalW>0?totalV/totalW:50;
    // Piecewise remap: top stays, bottom compresses
    if(raw>=90)return Math.min(99,Math.round(raw));
    if(raw>=80)return Math.round(70+(raw-80)*2);
    if(raw>=70)return Math.round(50+(raw-70)*2);
    return Math.max(1,Math.round(30+(raw-60)*2));
  },[]);
  const getGrade=useCallback((id)=>{const p=PROSPECTS.find(x=>x.id===id);if(!p)return 50;
    const pos=p.gpos||p.pos;const t=traits[id];
    // If user has set traits, use those (existing behavior with ceiling support)
    if(t&&Object.keys(t).length>0){const sc=getScoutingTraits(p.name,p.school)||{};const st=getStatBasedTraits(p.name,p.school)||{};const merged={...st,...sc,...t};const grade=gradeFromTraits(merged,pos);const ceil=t.__ceiling;if(!ceil||ceil==="normal")return grade;const weights=TRAIT_WEIGHTS[pos]||TRAIT_WEIGHTS["QB"];const posTraits=POSITION_TRAITS[pos]||[];let rawW=0,rawV=0;posTraits.forEach(trait=>{const teach=TRAIT_TEACHABILITY[trait]??0.5;if(teach<0.4){const w=weights[trait]||1/posTraits.length;rawW+=w;rawV+=(merged[trait]||50)*w;}});const rawScore=rawW>0?rawV/rawW:grade;const gap=rawScore-grade;if(ceil==="high")return Math.max(1,Math.min(99,Math.round(grade+Math.max(gap*0.5,0)+4)));if(ceil==="elite")return Math.max(1,Math.min(99,Math.round(grade+Math.max(gap*0.7,0)+7)));if(ceil==="capped")return Math.max(1,Math.min(99,Math.round(grade-Math.max(-gap*0.3,0)-3)));return grade;}
    // No user traits — use scouting data (with optional default ceiling)
    const sc=getScoutingTraits(p.name,p.school);
    if(sc){const grade=gradeFromTraits(sc,pos);const ceil=sc.__ceiling;if(!ceil||ceil==="normal")return grade;const weights=TRAIT_WEIGHTS[pos]||TRAIT_WEIGHTS["QB"];const posTraits=POSITION_TRAITS[pos]||[];let rawW=0,rawV=0;posTraits.forEach(trait=>{const teach=TRAIT_TEACHABILITY[trait]??0.5;if(teach<0.4){const w=weights[trait]||1/posTraits.length;rawW+=w;rawV+=(sc[trait]||50)*w;}});const rawScore=rawW>0?rawV/rawW:grade;const gap=rawScore-grade;if(ceil==="high")return Math.max(1,Math.min(99,Math.round(grade+Math.max(gap*0.5,0)+4)));if(ceil==="elite")return Math.max(1,Math.min(99,Math.round(grade+Math.max(gap*0.7,0)+7)));if(ceil==="capped")return Math.max(1,Math.min(99,Math.round(grade-Math.max(-gap*0.3,0)-3)));return grade;}
    return 50;
  },[traits,gradeFromTraits]);
  // Scouting-only grade — immutable, never reads user traits. Used for consensus board.
  const getScoutingGrade=useCallback((id)=>{const p=PROSPECTS.find(x=>x.id===id);if(!p)return 50;
    const pos=p.gpos||p.pos;
    const sc=getScoutingTraits(p.name,p.school);
    if(sc){const grade=gradeFromTraits(sc,pos);const ceil=sc.__ceiling;if(!ceil||ceil==="normal")return grade;const weights=TRAIT_WEIGHTS[pos]||TRAIT_WEIGHTS["QB"];const posTraits=POSITION_TRAITS[pos]||[];let rawW=0,rawV=0;posTraits.forEach(trait=>{const teach=TRAIT_TEACHABILITY[trait]??0.5;if(teach<0.4){const w=weights[trait]||1/posTraits.length;rawW+=w;rawV+=(sc[trait]||50)*w;}});const rawScore=rawW>0?rawV/rawW:grade;const gap=rawScore-grade;if(ceil==="high")return Math.max(1,Math.min(99,Math.round(grade+Math.max(gap*0.5,0)+4)));if(ceil==="elite")return Math.max(1,Math.min(99,Math.round(grade+Math.max(gap*0.7,0)+7)));if(ceil==="capped")return Math.max(1,Math.min(99,Math.round(grade-Math.max(-gap*0.3,0)-3)));return grade;}
    return 50;
  },[gradeFromTraits]);
  const getBoard=useCallback(()=>PROSPECTS.filter(p=>{const g=p.gpos||p.pos;const group=(g==="K"||g==="P"||g==="LS")?"K/P":g;const hasTraitEdits=traits[p.id]&&Object.keys(traits[p.id]).some(k=>k!=='__ceiling');return rankedGroups.has(group)||hasTraitEdits;}).sort((a,b)=>{const d=getGrade(b.id)-getGrade(a.id);return d!==0?d:(ratings[b.id]||1500)-(ratings[a.id]||1500);}),[rankedGroups,getGrade,ratings,traits]);

  // Build mock draft board: consensus order for all 319, user rankings override when graded
  const mockDraftBoard=useMemo(()=>{
    // Sort ALL prospects by grade (same as big board), break ties with consensus rank
    return [...PROSPECTS].sort((a,b)=>{const d=getGrade(b.id)-getGrade(a.id);return d!==0?d:getConsensusRank(a.name)-getConsensusRank(b.name);});
  },[getGrade]);

  const finishTraits=useCallback((pos)=>{setTraitReviewedGroups(prev=>new Set([...prev,pos]));const ranked=getRanked(pos);const byGrade=[...ranked].sort((a,b)=>getGrade(b.id)-getGrade(a.id));const conflicts=ranked.map((p,i)=>{const gi=byGrade.findIndex(x=>x.id===p.id);return Math.abs(i-gi)>=3?{player:p,pairRank:i+1,gradeRank:gi+1,grade:getGrade(p.id)}:null;}).filter(Boolean);if(conflicts.length){setReconcileQueue(conflicts);setReconcileIndex(0);setPhase("reconcile");}else setPhase("pick-position");},[getRanked,getGrade]);

  const SaveBar=()=>(<div style={{position:"fixed",top:0,left:0,right:0,zIndex:100,display:"flex",justifyContent:"space-between",alignItems:"center",padding:"6px 16px",background:"#fff",borderBottom:"1px solid #f0f0f0"}}><div style={{display:"flex",alignItems:"center",gap:12}}><img src="/logo.png" alt="BBL" style={{height:24,cursor:"pointer"}} onClick={()=>setPhase(rankedGroups.size>0?"pick-position":"home")}/><span style={{fontFamily:mono,fontSize:10,color:"#a3a3a3"}}>{isGuest?"guest":user?.email}</span></div><div style={{display:"flex",alignItems:"center",gap:8}}>{!showOnboarding&&<button onClick={()=>setShowOnboarding(true)} style={{fontFamily:sans,fontSize:10,color:"#a3a3a3",background:"none",border:"1px solid #e5e5e5",borderRadius:99,padding:"3px 8px",cursor:"pointer"}} title="How it works">?</button>}{!isGuest&&<span style={{fontFamily:mono,fontSize:10,color:saving?"#ca8a04":"#d4d4d4"}}>{saving?"saving...":lastSaved?`saved ${new Date(lastSaved).toLocaleTimeString()}`:""}</span>}<button onClick={isGuest?()=>onRequireAuth("sign in to save your progress"):onSignOut} style={{fontFamily:sans,fontSize:10,color:"#a3a3a3",background:"none",border:"1px solid #e5e5e5",borderRadius:99,padding:"3px 10px",cursor:"pointer"}}>{isGuest?"sign in":"sign out"}</button></div></div>);

  // === MOCK DRAFT (check before phase returns to fix click bug) ===
  // My Guys state
  const[myGuys,setMyGuys]=useState([]);
  const[myGuysUpdated,setMyGuysUpdated]=useState(false);
  const myGuysInitialLoad=useRef(true);
  const[showMyGuys,setShowMyGuys]=useState(false);
  const[mockCount,setMockCount]=useState(0);
  const[copiedShare,setCopiedShare]=useState(null);
  useEffect(()=>{window.scrollTo(0,0);},[phase,showMyGuys]);
  const traitsRef=useRef(traits);traitsRef.current=traits;
  const ratingsRef=useRef(ratings);ratingsRef.current=ratings;
  const getGradeRef=useRef(getGrade);getGradeRef.current=getGrade;

  const loadMyGuys=useCallback(async()=>{
    if(!user?.id)return;
    try{
      const{data,error}=await supabase.from('mock_picks').select('prospect_name,prospect_pos,pick_number,is_user_pick,grade,mock_id').eq('user_id',user.id);
      if(error||!data)return;
      const uniqueMocks=new Set(data.map(d=>d.mock_id));
      setMockCount(uniqueMocks.size);
      const userPicks=data.filter(d=>d.is_user_pick);
      const pm={};
      userPicks.forEach(pk=>{
        if(!pm[pk.prospect_name])pm[pk.prospect_name]={name:pk.prospect_name,pos:pk.prospect_pos,picks:[],grades:[]};
        pm[pk.prospect_name].picks.push(pk.pick_number);
        if(pk.grade!=null)pm[pk.prospect_name].grades.push(pk.grade);
      });
      const totalMocks=uniqueMocks.size||1;
      const candidates=Object.values(pm).map(p=>{
        const avgPick=p.picks.reduce((a,b)=>a+b,0)/p.picks.length;
        const cr=getConsensusRank(p.name)||999;
        const delta=cr-avgPick;
        const avgGrade=p.grades.length>0?Math.round(p.grades.reduce((a,b)=>a+b,0)/p.grades.length):null;

        // Find prospect for grade lookup
        const prospect=PROSPECTS.find(x=>x.name===p.name);
        const hasUserInput=prospect&&(
          (traitsRef.current[prospect.id]&&Object.keys(traitsRef.current[prospect.id]).length>0)||
          (ratingsRef.current[prospect.id]&&ratingsRef.current[prospect.id]!==1500)
        );

        // Signal 1: User ranking vs consensus (0-100)
        let rankingSignal=50;
        if(hasUserInput&&prospect){
          const userGrade=getGradeRef.current(prospect.id);
          const consGrade=getConsensusGrade(p.name);
          rankingSignal=Math.max(0,Math.min(100,((userGrade-consGrade)+30)/60*100));
        }

        // Signal 2: Draft frequency (0-100)
        const frequencySignal=Math.min(100,(p.picks.length/totalMocks)*100);

        // Signal 3: Draft position vs consensus, clamped (0-100)
        const clampedDelta=Math.max(-50,Math.min(50,delta));
        const draftSignal=clampedDelta+50;

        // Weighted score — redistribute ranking weight if no user input
        const rw=hasUserInput?0.50:0;
        const fw=hasUserInput?0.30:0.55;
        const dw=hasUserInput?0.20:0.45;
        const score=rw*rankingSignal+fw*frequencySignal+dw*draftSignal;

        return{...p,avgPick:Math.round(avgPick*10)/10,consensusRank:cr,delta:Math.round(delta*10)/10,timesDrafted:p.picks.length,avgGrade,score:Math.round(score*10)/10};
      });
      const sorted=candidates.sort((a,b)=>b.score-a.score).slice(0,10);
      const prevNames=myGuys.map(g=>g.name).join(',');
      const newNames=sorted.map(g=>g.name).join(',');
      if(newNames&&newNames!==prevNames&&!myGuysInitialLoad.current)setMyGuysUpdated(true);
      myGuysInitialLoad.current=false;
      setMyGuys(sorted);
    }catch(e){console.error('Failed to load my guys:',e);}
  },[user?.id,getConsensusRank]);

  // Save mock draft picks to Supabase for ADP tracking and My Guys
  const saveMockPicks=useCallback(async(picks)=>{
    if(!user?.id||!picks?.length)return;
    try{
      const rows=picks.map(pk=>({
        user_id:user.id,
        mock_id:pk.mockId,
        prospect_name:pk.prospectName,
        prospect_pos:pk.prospectPos,
        team:pk.team,
        pick_number:pk.pickNumber,
        round:pk.round,
        is_user_pick:pk.isUserPick,
        grade:pk.grade
      }));
      for(let i=0;i<rows.length;i+=50){
        await supabase.from('mock_picks').insert(rows.slice(i,i+50));
      }
      loadMyGuys();
    }catch(e){console.error('Failed to save mock picks:',e);}
  },[user?.id,loadMyGuys]);

  useEffect(()=>{loadMyGuys();},[loadMyGuys]);

  // Share my guys as branded image — defined before conditional returns so it can be passed as prop
  const shareMyGuys=useCallback(async()=>{
    const count=myGuys.length;if(count===0)return;
    const rows=Math.ceil(count/2)||1;const scale=2;
    const fp=(()=>{
      if(myGuys.length<5)return[];const pills=[];
      const guys=myGuys.map(g=>{const p=PROSPECTS.find(pr=>pr.name===g.name);return{...g,prospect:p,gpos:p?.gpos||g.pos,school:p?.school||"",id:p?.id};});
      const posCounts={};guys.forEach(g=>{const pos=g.gpos==="K"||g.gpos==="P"||g.gpos==="LS"?"K/P":g.gpos;posCounts[pos]=(posCounts[pos]||0)+1;});
      const topPos=Object.entries(posCounts).sort((a,b)=>b[1]-a[1]);
      if(topPos.length>0&&topPos[0][1]>=Math.ceil(guys.length*0.3)){const[pos,cnt]=topPos[0];pills.push({emoji:POS_EMOJI[pos]||"📋",text:`${pos} heavy`,detail:`${cnt}/${guys.length}`,color:POS_COLORS[pos]||"#525252"});}
      else if(topPos.length>=4&&topPos[0][1]-topPos[topPos.length-1][1]<=1){pills.push({emoji:"🔀",text:"balanced board",detail:"",color:"#525252"});}
      const traitCounts={};guys.forEach(g=>{if(!g.id)return;const badges=prospectBadges[g.id]||[];badges.forEach(b=>{traitCounts[b.trait]=(traitCounts[b.trait]||0)+1;});});
      const topTraits=Object.entries(traitCounts).filter(([,c])=>c>=3).sort((a,b)=>b[1]-a[1]).slice(0,2);
      topTraits.forEach(([trait,cnt])=>{const labels={"Pass Rush":"pass rush magnet","Speed":"speed obsessed","Man Coverage":"lockdown lean","Accuracy":"accuracy snob","Motor":"motor lovers","Ball Skills":"ball hawk bias","Tackling":"sure tacklers","Vision":"vision seekers","Hands":"reliable hands","First Step":"first step fanatic","Athleticism":"athletic bias"};pills.push({emoji:TRAIT_EMOJI[trait]||"⭐",text:labels[trait]||trait.toLowerCase(),detail:`${cnt}x`,color:"#7c3aed"});});
      const ceilCounts={elite:0,high:0,normal:0,capped:0};guys.forEach(g=>{const sc=getScoutingTraits(g.name,g.school);const c=sc?.__ceiling||"normal";ceilCounts[c]++;});
      const upside=ceilCounts.elite+ceilCounts.high;
      if(upside>=Math.ceil(guys.length*0.6)){pills.push({emoji:"⭐",text:"ceiling chaser",detail:`${upside}/${guys.length} high+`,color:"#ea580c"});}
      else if(ceilCounts.capped>=Math.ceil(guys.length*0.3)){pills.push({emoji:"🔒",text:"floor first",detail:`${ceilCounts.capped} capped`,color:"#64748b"});}
      const avgDelta=guys.reduce((s,g)=>s+g.delta,0)/guys.length;
      if(avgDelta>10){pills.push({emoji:"📈",text:"value hunter",detail:`+${Math.round(avgDelta)} avg`,color:"#16a34a"});}
      else if(avgDelta<-5){pills.push({emoji:"🎲",text:"reach drafter",detail:`${Math.round(avgDelta)} avg`,color:"#dc2626"});}
      else{pills.push({emoji:"⚖️",text:"consensus aligned",detail:`${avgDelta>0?"+":""}${Math.round(avgDelta)}`,color:"#525252"});}
      const confCounts={};guys.forEach(g=>{const conf=SCHOOL_CONFERENCE[g.school];if(conf&&conf!=="FCS"&&conf!=="D2"&&conf!=="D3"&&conf!=="Ind")confCounts[conf]=(confCounts[conf]||0)+1;});
      const topConf=Object.entries(confCounts).sort((a,b)=>b[1]-a[1]);
      if(topConf.length>0&&topConf[0][1]>=Math.ceil(guys.length*0.5)){pills.push({emoji:"🏈",text:`${topConf[0][0]} lean`,detail:`${topConf[0][1]}/${guys.length}`,color:"#0369a1"});}
      const schoolCounts={};guys.forEach(g=>{if(g.school)schoolCounts[g.school]=(schoolCounts[g.school]||0)+1;});
      const repeats=Object.entries(schoolCounts).filter(([,c])=>c>=2).sort((a,b)=>b[1]-a[1]);
      if(repeats.length>0){const[sch,cnt]=repeats[0];pills.push({emoji:"🏫",text:`${sch} pipeline`,detail:`${cnt}`,color:"#7c3aed"});}
      return pills.slice(0,6);
    })();
    const fpH=fp.length>0?36:0;
    const W=1200,headerH=90,footerH=52,cardGap=14,padX=32,padTop=16;
    const colW=(W-padX*2-cardGap)/2;const cardH=260;
    const gridH=rows*cardH+(rows-1)*cardGap;
    const H=headerH+fpH+padTop+gridH+padTop+footerH;
    const canvas=document.createElement('canvas');canvas.width=W*scale;canvas.height=H*scale;
    const ctx=canvas.getContext('2d');ctx.scale(scale,scale);
    ctx.fillStyle='#faf9f6';ctx.fillRect(0,0,W,H);
    const tGrad=ctx.createLinearGradient(0,0,W,0);tGrad.addColorStop(0,'#ec4899');tGrad.addColorStop(1,'#7c3aed');
    ctx.fillStyle=tGrad;ctx.fillRect(0,0,W,4);
    ctx.textBaseline='top';ctx.textAlign='left';
    ctx.fillStyle='#171717';ctx.font='bold 32px -apple-system,system-ui,sans-serif';
    ctx.fillText('\ud83d\udc40 MY GUYS',padX,22);
    ctx.fillStyle='#a3a3a3';ctx.font='11px ui-monospace,monospace';
    ctx.fillText('BIGBOARDLAB.COM  \u00b7  2026 NFL DRAFT',padX,60);
    const sGrad=ctx.createLinearGradient(padX,0,W-padX,0);sGrad.addColorStop(0,'#ec4899');sGrad.addColorStop(1,'#7c3aed');
    ctx.fillStyle=sGrad;ctx.fillRect(padX,headerH-6,W-padX*2,2);
    const rr=(x,y,w,h,r)=>{ctx.beginPath();ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);ctx.quadraticCurveTo(x+w,y,x+w,y+r);ctx.lineTo(x+w,y+h-r);ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);ctx.lineTo(x+r,y+h);ctx.quadraticCurveTo(x,y+h,x,y+h-r);ctx.lineTo(x,y+r);ctx.quadraticCurveTo(x,y,x+r,y);ctx.closePath();};
    if(fp.length>0){
      let fpX=padX;const fpY=headerH+6;ctx.font='11px -apple-system,system-ui,sans-serif';
      fp.forEach(pill=>{const label=`${pill.emoji} ${pill.text}${pill.detail?' ('+pill.detail+')':''}`;const tw=ctx.measureText(label).width+16;ctx.fillStyle=pill.color+'18';rr(fpX,fpY,tw,22,11);ctx.fill();ctx.fillStyle=pill.color;ctx.font='bold 11px -apple-system,system-ui,sans-serif';ctx.textBaseline='middle';ctx.fillText(label,fpX+8,fpY+11);fpX+=tw+8;});
      ctx.textBaseline='top';ctx.textAlign='left';
    }
    const logoCache={};const prospectMap={};
    myGuys.forEach(g=>{const p=PROSPECTS.find(pr=>pr.name===g.name);if(p)prospectMap[g.name]=p;});
    const schools=[...new Set(Object.values(prospectMap).map(p=>p.school).filter(Boolean))];
    await Promise.all(schools.map(async s=>{const url=schoolLogo(s);if(!url)return;try{const img=new Image();img.crossOrigin='anonymous';img.src=url;await new Promise((res,rej)=>{img.onload=res;img.onerror=rej;setTimeout(rej,2000);});logoCache[s]=img;}catch(e){}}));
    const drawCardRadar=(cx0,cy0,rad,traitNames,values,color)=>{const n=traitNames.length;if(n<3)return;const angles=traitNames.map((_,j)=>(Math.PI*2*j/n)-Math.PI/2);const pt=(a,v)=>[cx0+rad*v*Math.cos(a),cy0+rad*v*Math.sin(a)];[0.25,0.5,0.75,1].forEach(lv=>{ctx.beginPath();angles.forEach((a,j)=>{const[px,py]=pt(a,lv);j===0?ctx.moveTo(px,py):ctx.lineTo(px,py);});ctx.closePath();ctx.strokeStyle='#e5e5e5';ctx.lineWidth=lv===1?0.8:0.4;ctx.stroke();});ctx.fillStyle='#a3a3a3';ctx.font='7px ui-monospace,monospace';ctx.textAlign='center';ctx.textBaseline='middle';angles.forEach((a,j)=>{const[lx,ly]=pt(a,1.22);ctx.fillText(traitNames[j].split(' ')[0],lx,ly);});ctx.beginPath();angles.forEach((a,j)=>{const v=Math.max(0.05,values[j]||0);const[px,py]=pt(a,v);j===0?ctx.moveTo(px,py):ctx.lineTo(px,py);});ctx.closePath();ctx.fillStyle=color+'20';ctx.fill();ctx.strokeStyle=color;ctx.lineWidth=1.2;ctx.stroke();angles.forEach((a,j)=>{const v=Math.max(0.05,values[j]||0);const[px,py]=pt(a,v);ctx.beginPath();ctx.arc(px,py,2,0,Math.PI*2);ctx.fillStyle=color;ctx.fill();});ctx.textAlign='left';ctx.textBaseline='top';};
    const TRAIT_MAP=POSITION_TRAITS;
    for(let i=0;i<count;i++){const col=i%2,row=Math.floor(i/2);const cx0=padX+col*(colW+cardGap);const cy0=headerH+fpH+padTop+row*(cardH+cardGap);const g=myGuys[i];const p=prospectMap[g.name];const c=POS_COLORS[g.pos]||'#525252';ctx.fillStyle='#ffffff';rr(cx0,cy0,colW,cardH,14);ctx.fill();ctx.strokeStyle='#e5e5e5';ctx.lineWidth=1;rr(cx0,cy0,colW,cardH,14);ctx.stroke();const tx=cx0+16,ty=cy0+16;ctx.fillStyle='#d4d4d4';ctx.font='bold 22px -apple-system,system-ui,sans-serif';ctx.textAlign='left';ctx.textBaseline='top';ctx.fillText(String(i+1),tx,ty);const logoX=tx+30;const school=p?.school;if(school&&logoCache[school])ctx.drawImage(logoCache[school],logoX,ty-2,28,28);const nameX=logoX+34;ctx.fillStyle='#171717';ctx.font='bold 16px -apple-system,system-ui,sans-serif';const maxNameW=colW-16-30-34-60;ctx.save();ctx.beginPath();ctx.rect(nameX,ty,maxNameW,30);ctx.clip();ctx.fillText(g.name,nameX,ty);ctx.restore();ctx.fillStyle='#a3a3a3';ctx.font='10px ui-monospace,monospace';ctx.fillText(school||'',nameX,ty+20);const posText=g.pos;ctx.font='bold 10px ui-monospace,monospace';const pw=ctx.measureText(posText).width+14;const pillX=cx0+colW-16-pw;ctx.fillStyle=c+'18';rr(pillX,ty+2,pw,20,4);ctx.fill();ctx.fillStyle=c;ctx.fillText(posText,pillX+7,ty+7);const traitPos=g.pos==='DB'?(getProspectStats(g.name)?.gpos||'CB'):g.pos==='OL'?'OT':g.pos;const traitKeys=TRAIT_MAP[traitPos]||TRAIT_MAP['QB'];const traitVals=traitKeys.map(t=>tv(traits,p?.id,t,g.name,p?.school||'')/100);drawCardRadar(cx0+colW/2,cy0+52+70,58,traitKeys,traitVals,c);const by=cy0+cardH-40;ctx.fillStyle='#f5f5f5';ctx.fillRect(cx0+16,by-6,colW-32,1);const grade=p?getGrade(p.id):null;if(grade){ctx.font='bold 24px -apple-system,system-ui,sans-serif';ctx.fillStyle=grade>=75?'#16a34a':grade>=55?'#ca8a04':'#dc2626';ctx.textAlign='left';ctx.textBaseline='top';ctx.fillText(String(grade),cx0+16,by);}const badges=p?prospectBadges[p.id]||[]:[];if(badges.length>0){ctx.font='14px -apple-system,system-ui,sans-serif';ctx.textAlign='right';ctx.textBaseline='top';ctx.fillText(badges.map(b=>b.emoji).join(' '),cx0+colW-16,by+4);}ctx.textAlign='left';ctx.textBaseline='top';}
    let logoImg=null;try{logoImg=new Image();logoImg.src='/logo.png';await new Promise((res,rej)=>{logoImg.onload=res;logoImg.onerror=rej;setTimeout(rej,2000);});}catch(e){logoImg=null;}
    const fy=H-footerH;ctx.fillStyle='#111';ctx.fillRect(0,fy,W,footerH);const logoOffset=logoImg?36:0;if(logoImg)ctx.drawImage(logoImg,padX,fy+10,32,32);ctx.fillStyle='#fff';ctx.font='bold 14px -apple-system,system-ui,sans-serif';ctx.textBaseline='middle';ctx.fillText('bigboardlab.com',padX+logoOffset+8,fy+footerH/2);ctx.fillStyle='#888';ctx.font='11px -apple-system,system-ui,sans-serif';ctx.textAlign='right';ctx.fillText(`${new Date().toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}).toUpperCase()}  \u00b7  BUILD YOURS \u2192 BIGBOARDLAB.COM`,W-padX,fy+footerH/2);ctx.textAlign='left';ctx.textBaseline='top';
    const bGrad=ctx.createLinearGradient(0,0,W,0);bGrad.addColorStop(0,'#ec4899');bGrad.addColorStop(1,'#7c3aed');ctx.fillStyle=bGrad;ctx.fillRect(0,H-3,W,3);
    canvas.toBlob(async blob=>{if(!blob)return;const fname='bigboardlab-my-guys.png';const isMobile=/iPhone|iPad|iPod|Android/i.test(navigator.userAgent);if(isMobile&&navigator.share&&navigator.canShare){try{const file=new File([blob],fname,{type:'image/png'});if(navigator.canShare({files:[file]})){await navigator.share({files:[file],title:'My Guys \u2014 Big Board Lab',text:'My 2026 NFL Draft guys! Build yours at bigboardlab.com'});return;}}catch(e){}}try{await navigator.clipboard.write([new ClipboardItem({'image/png':blob})]);setCopiedShare("my-guys");setTimeout(()=>setCopiedShare(null),1500);}catch(e){const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=fname;document.body.appendChild(a);a.click();document.body.removeChild(a);setTimeout(()=>URL.revokeObjectURL(url),3000);}trackEvent(user?.id,'share_triggered',{type:'my_guys',count:myGuys.length,guest:!user});},'image/png');
  },[myGuys,traits,getGrade,prospectBadges]);

  // Share top 10 (overall or position-specific) as branded image
  const sharePositionTop10=useCallback(async(pos)=>{
    const board=getBoard();
    const singlePos=pos||null;
    const top10=(singlePos?board.filter(p=>(p.gpos||p.pos)===singlePos):board).slice(0,10);
    if(top10.length===0)return;

    const scale=2;
    const W=1200,padX=32,cardH=134,cardGap=12,headerH=90,footerH=52;
    const H=headerH+top10.length*(cardH+cardGap)+footerH+16;
    const canvas=document.createElement('canvas');canvas.width=W*scale;canvas.height=H*scale;
    const ctx=canvas.getContext('2d');ctx.scale(scale,scale);

    const rr=(x,y,w,h,r)=>{ctx.beginPath();ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);ctx.quadraticCurveTo(x+w,y,x+w,y+r);ctx.lineTo(x+w,y+h-r);ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);ctx.lineTo(x+r,y+h);ctx.quadraticCurveTo(x,y+h,x,y+h-r);ctx.lineTo(x,y+r);ctx.quadraticCurveTo(x,y,x+r,y);ctx.closePath();};

    ctx.fillStyle='#faf9f6';ctx.fillRect(0,0,W,H);

    const tGrad=ctx.createLinearGradient(0,0,W,0);
    tGrad.addColorStop(0,'#ec4899');tGrad.addColorStop(1,'#7c3aed');
    ctx.fillStyle=tGrad;ctx.fillRect(0,0,W,4);

    ctx.textBaseline='top';ctx.textAlign='left';
    ctx.fillStyle='#171717';ctx.font='bold 32px -apple-system,system-ui,sans-serif';
    const title=singlePos?`\u{1f4cb} MY TOP 10 ${singlePos}s`:'\u{1f4cb} MY BIG BOARD \u2014 TOP 10';
    ctx.fillText(title,padX,22);
    ctx.fillStyle='#a3a3a3';ctx.font='11px ui-monospace,monospace';
    ctx.fillText('BIGBOARDLAB.COM  \u00b7  2026 NFL DRAFT',padX,56);

    const sGrad=ctx.createLinearGradient(padX,0,W-padX,0);
    sGrad.addColorStop(0,'#ec4899');sGrad.addColorStop(1,'#7c3aed');
    ctx.fillStyle=sGrad;ctx.fillRect(padX,headerH-6,W-padX*2,2);

    const logoCache={};
    const schools=[...new Set(top10.map(p=>p.school))];
    await Promise.all(schools.map(async s=>{
      const url=schoolLogo(s);
      if(!url)return;
      try{const img=new Image();img.crossOrigin='anonymous';img.src=url;await new Promise((res,rej)=>{img.onload=res;img.onerror=rej;setTimeout(rej,2000);});logoCache[s]=img;}catch(e){}
    }));

    const drawRadar=(cx,cy,r,traitNames,values,color)=>{
      const n=traitNames.length;if(n<3)return;
      const angles=traitNames.map((_,i)=>(Math.PI*2*i)/n-Math.PI/2);
      ctx.strokeStyle='#e0e0e0';ctx.lineWidth=0.5;
      [0.25,0.5,0.75,1].forEach(lv=>{
        ctx.beginPath();
        angles.forEach((a,i)=>{const x=cx+r*lv*Math.cos(a),y=cy+r*lv*Math.sin(a);i===0?ctx.moveTo(x,y):ctx.lineTo(x,y);});
        ctx.closePath();ctx.stroke();
      });
      angles.forEach(a=>{ctx.beginPath();ctx.moveTo(cx,cy);ctx.lineTo(cx+r*Math.cos(a),cy+r*Math.sin(a));ctx.stroke();});
      const pts=angles.map((a,i)=>{const v=(values[i]||50)/100;return[cx+r*v*Math.cos(a),cy+r*v*Math.sin(a)];});
      ctx.beginPath();pts.forEach(([x,y],i)=>i===0?ctx.moveTo(x,y):ctx.lineTo(x,y));ctx.closePath();
      ctx.fillStyle=color+'25';ctx.fill();ctx.strokeStyle=color;ctx.lineWidth=1.5;ctx.stroke();
      pts.forEach(([x,y])=>{ctx.beginPath();ctx.arc(x,y,2.5,0,Math.PI*2);ctx.fillStyle=color;ctx.fill();});
      ctx.fillStyle='#999';ctx.font='9px -apple-system,system-ui,sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';
      traitNames.forEach((t,i)=>{
        const lr=r+16;const x=cx+lr*Math.cos(angles[i]),y=cy+lr*Math.sin(angles[i]);
        ctx.fillText(t,x,y);
      });
      ctx.textAlign='left';ctx.textBaseline='top';
    };

    const posRanks={};
    board.forEach((p,i)=>{
      const pk=(p.gpos||p.pos)==='K'||(p.gpos||p.pos)==='P'||(p.gpos||p.pos)==='LS'?'K/P':(p.gpos||p.pos);
      if(!posRanks[pk])posRanks[pk]=0;
      posRanks[pk]++;
      p._posRank=posRanks[pk];
    });

    top10.forEach((p,i)=>{
      const cy=headerH+i*(cardH+cardGap);
      const grade=getGrade(p.id);
      const posKey=(p.gpos||p.pos)==='K'||(p.gpos||p.pos)==='P'||(p.gpos||p.pos)==='LS'?'K/P':(p.gpos||p.pos);
      const c=POS_COLORS[posKey]||POS_COLORS[p.pos]||'#525252';
      const posTraits=POSITION_TRAITS[p.pos]||POSITION_TRAITS[posKey]||[];
      const traitVals=posTraits.map(t=>tv(traits,p.id,t,p.name,p.school));

      ctx.fillStyle='#ffffff';rr(padX,cy,W-padX*2,cardH,14);ctx.fill();
      ctx.strokeStyle='#e5e5e5';ctx.lineWidth=1;rr(padX,cy,W-padX*2,cardH,14);ctx.stroke();

      ctx.fillStyle=c;ctx.fillRect(padX+1,cy+8,4,cardH-16);

      ctx.fillStyle='#d4d4d4';ctx.font='bold 28px ui-monospace,monospace';
      ctx.textAlign='right';ctx.fillText(`${i+1}`.padStart(2,' '),padX+56,cy+cardH/2-14);ctx.textAlign='left';

      if(logoCache[p.school])ctx.drawImage(logoCache[p.school],padX+70,cy+cardH/2-24,48,48);

      ctx.fillStyle='#171717';ctx.font='bold 22px -apple-system,system-ui,sans-serif';
      ctx.fillText(p.name,padX+130,cy+26);

      const posText=p.gpos||p.pos;
      ctx.font='bold 12px ui-monospace,monospace';
      const pw=ctx.measureText(posText).width+14;
      ctx.fillStyle=c+'18';rr(padX+130,cy+54-4,pw,24,6);ctx.fill();
      ctx.fillStyle=c;ctx.font='bold 12px ui-monospace,monospace';
      ctx.fillText(posText,padX+130+7,cy+54+2);

      let afterX=padX+130+pw+10;
      ctx.fillStyle='#a3a3a3';ctx.font='13px -apple-system,system-ui,sans-serif';
      ctx.fillText(p.school,afterX,cy+54+2);
      afterX+=ctx.measureText(p.school).width;

      if(p._posRank){
        const prText=posText+p._posRank;
        afterX+=12;
        ctx.fillStyle=c;ctx.font='bold 11px ui-monospace,monospace';
        ctx.fillText(prText,afterX,cy+54+3);
        afterX+=ctx.measureText(prText).width;
      }

      const badges=prospectBadges[p.id]||[];
      if(badges.length>0){afterX+=14;ctx.font='15px -apple-system,system-ui,sans-serif';badges.forEach(b=>{ctx.fillText(b.emoji,afterX,cy+54);afterX+=20;});}

      const radarCx=W-padX-170,radarCy=cy+cardH/2,radarR=42;
      if(posTraits.length>=3)drawRadar(radarCx,radarCy,radarR,posTraits,traitVals,c);

      const gColor=grade>=75?'#16a34a':grade>=55?'#ca8a04':'#dc2626';
      ctx.fillStyle=gColor;ctx.font='bold 36px -apple-system,system-ui,sans-serif';
      ctx.textAlign='right';ctx.fillText(`${grade}`,W-padX-16,cy+34);ctx.textAlign='left';
    });

    let logoImg=null;
    try{logoImg=new Image();logoImg.crossOrigin='anonymous';logoImg.src='/logo.png';await new Promise((res,rej)=>{logoImg.onload=res;logoImg.onerror=rej;setTimeout(rej,2000);});}catch(e){logoImg=null;}
    const fy=H-footerH;
    ctx.fillStyle='#111';ctx.fillRect(0,fy,W,footerH);
    const logoOffset=logoImg?36:0;
    if(logoImg)ctx.drawImage(logoImg,padX,fy+10,32,32);
    ctx.fillStyle='#fff';ctx.font='bold 14px -apple-system,system-ui,sans-serif';
    ctx.textBaseline='middle';
    ctx.fillText('bigboardlab.com',padX+logoOffset+8,fy+footerH/2);
    ctx.fillStyle='#888';ctx.font='11px -apple-system,system-ui,sans-serif';
    ctx.textAlign='right';
    ctx.fillText(`${new Date().toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}).toUpperCase()}  \u00b7  BUILD YOURS \u2192 BIGBOARDLAB.COM`,W-padX,fy+footerH/2);
    ctx.textAlign='left';ctx.textBaseline='top';
    const bGrad=ctx.createLinearGradient(0,0,W,0);bGrad.addColorStop(0,'#ec4899');bGrad.addColorStop(1,'#7c3aed');
    ctx.fillStyle=bGrad;ctx.fillRect(0,H-3,W,3);

    canvas.toBlob(async blob=>{
      if(!blob)return;
      const fname=singlePos?`bigboardlab-top10-${singlePos}.png`:'bigboardlab-top10.png';
      const isMobile=/iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      if(isMobile&&navigator.share&&navigator.canShare){
        try{const file=new File([blob],fname,{type:'image/png'});if(navigator.canShare({files:[file]})){await navigator.share({files:[file],title:'My Big Board — Big Board Lab',text:'My 2026 NFL Draft Big Board! Build yours at bigboardlab.com'});return;}}catch(e){}
      }
      try{await navigator.clipboard.write([new ClipboardItem({'image/png':blob})]);
        setCopiedShare("top10");setTimeout(()=>setCopiedShare(null),1500);
      }catch(e){const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=fname;a.click();URL.revokeObjectURL(url);}
      trackEvent(user?.id,'share_triggered',{type:singlePos?'position_top10':'board_top10',position:singlePos||'all',guest:!user});
    });
  },[getBoard,getGrade,traits,prospectBadges]);

  if(phase==="loading")return(<div style={{minHeight:"100vh",background:"#faf9f6",display:"flex",alignItems:"center",justifyContent:"center"}}><p style={{fontFamily:sans,fontSize:14,color:"#a3a3a3"}}>loading your board...</p></div>);



  if(showMockDraft){const myBoard=[...PROSPECTS].sort((a,b)=>{const gA=(a.gpos==="K"||a.gpos==="P"||a.gpos==="LS")?"K/P":(a.gpos||a.pos);const gB=(b.gpos==="K"||b.gpos==="P"||b.gpos==="LS")?"K/P":(b.gpos||b.pos);const aRanked=rankedGroups.has(gA);const bRanked=rankedGroups.has(gB);if(aRanked&&!bRanked)return-1;if(!aRanked&&bRanked)return 1;if(aRanked&&bRanked){const d=getGrade(b.id)-getGrade(a.id);return d!==0?d:(ratings[b.id]||1500)-(ratings[a.id]||1500);}return getConsensusRank(a.name)-getConsensusRank(b.name);});return<MockDraftSim board={mockDraftBoard} myBoard={myBoard} getGrade={getGrade} teamNeeds={TEAM_NEEDS} draftOrder={DRAFT_ORDER} onClose={()=>{setShowMockDraft(false);setMockLaunchTeam(null);}} onMockComplete={saveMockPicks} myGuys={myGuys} myGuysUpdated={myGuysUpdated} setMyGuysUpdated={setMyGuysUpdated} mockCount={mockCount} allProspects={PROSPECTS} PROSPECTS={PROSPECTS} CONSENSUS={CONSENSUS} ratings={ratings} traits={traits} setTraits={setTraits} notes={notes} setNotes={setNotes} POS_COLORS={POS_COLORS} POSITION_TRAITS={POSITION_TRAITS} SchoolLogo={SchoolLogo} NFLTeamLogo={NFLTeamLogo} RadarChart={RadarChart} PlayerProfile={PlayerProfile} font={font} mono={mono} sans={sans} schoolLogo={schoolLogo} getConsensusRank={getConsensusRank} getConsensusGrade={getConsensusGrade} TEAM_NEEDS_DETAILED={TEAM_NEEDS_DETAILED} rankedGroups={rankedGroups} mockLaunchTeam={mockLaunchTeam} mockLaunchRounds={mockRounds} mockLaunchSpeed={mockSpeed} mockLaunchCpuTrades={mockCpuTrades} mockLaunchBoardMode={mockBoardMode} onRankPosition={(pos)=>{setShowMockDraft(false);setMockLaunchTeam(null);startRanking(pos);}} isGuest={isGuest} onRequireAuth={onRequireAuth} trackEvent={trackEvent} userId={user?.id} isGuestUser={!user} traitThresholds={traitThresholds} qualifiesForFilter={qualifiesForFilter} prospectBadges={prospectBadges} TRAIT_ABBREV={TRAIT_ABBREV} TRAIT_EMOJI={TRAIT_EMOJI} SCHOOL_CONFERENCE={SCHOOL_CONFERENCE} POS_EMOJI={POS_EMOJI} onShareMyGuys={shareMyGuys} copiedShare={copiedShare}/>;}
  // === HOME ===
  // My Guys page — full screen overlay
  if(showMyGuys){
    const TRAIT_MAP=POSITION_TRAITS;
    const emptySlots=Array.from({length:Math.max(0,10-myGuys.length)});

    // Scouting Fingerprint — generate insight pills from My Guys data
    const fingerprint=(()=>{
      if(myGuys.length<5)return[];
      const pills=[];
      const guys=myGuys.map(g=>{const p=PROSPECTS.find(pr=>pr.name===g.name);return{...g,prospect:p,gpos:p?.gpos||g.pos,school:p?.school||"",id:p?.id};});

      // 1. Position concentrations
      const posCounts={};
      guys.forEach(g=>{const pos=g.gpos==="K"||g.gpos==="P"||g.gpos==="LS"?"K/P":g.gpos;posCounts[pos]=(posCounts[pos]||0)+1;});
      const topPos=Object.entries(posCounts).sort((a,b)=>b[1]-a[1]);
      if(topPos.length>0&&topPos[0][1]>=Math.ceil(guys.length*0.3)){
        const[pos,cnt]=topPos[0];
        pills.push({emoji:POS_EMOJI[pos]||"📋",text:`${pos} heavy`,detail:`${cnt}/${guys.length}`,color:POS_COLORS[pos]||"#525252"});
      }else if(topPos.length>=4&&topPos[0][1]-topPos[topPos.length-1][1]<=1){
        pills.push({emoji:"🔀",text:"balanced board",detail:"",color:"#525252"});
      }

      // 2. Trait clusters — aggregate badge traits
      const traitCounts={};
      guys.forEach(g=>{if(!g.id)return;const badges=prospectBadges[g.id]||[];badges.forEach(b=>{traitCounts[b.trait]=(traitCounts[b.trait]||0)+1;});});
      const topTraits=Object.entries(traitCounts).filter(([,c])=>c>=3).sort((a,b)=>b[1]-a[1]).slice(0,2);
      topTraits.forEach(([trait,cnt])=>{
        const labels={"Pass Rush":"pass rush magnet","Speed":"speed obsessed","Man Coverage":"lockdown lean","Accuracy":"accuracy snob","Motor":"motor lovers","Ball Skills":"ball hawk bias","Tackling":"sure tacklers","Vision":"vision seekers","Hands":"reliable hands","First Step":"first step fanatic","Athleticism":"athletic bias"};
        pills.push({emoji:TRAIT_EMOJI[trait]||"⭐",text:labels[trait]||trait.toLowerCase(),detail:`${cnt}x`,color:"#7c3aed"});
      });

      // 3. Ceiling tendency
      const ceilCounts={elite:0,high:0,normal:0,capped:0};
      guys.forEach(g=>{const sc=getScoutingTraits(g.name,g.school);const c=sc?.__ceiling||"normal";ceilCounts[c]++;});
      const upside=ceilCounts.elite+ceilCounts.high;
      if(upside>=Math.ceil(guys.length*0.6)){
        pills.push({emoji:"⭐",text:"ceiling chaser",detail:`${upside}/${guys.length} high+`,color:"#ea580c"});
      }else if(ceilCounts.capped>=Math.ceil(guys.length*0.3)){
        pills.push({emoji:"🔒",text:"floor first",detail:`${ceilCounts.capped} capped`,color:"#64748b"});
      }

      // 4. Draft behavior (delta-based)
      const avgDelta=guys.reduce((s,g)=>s+g.delta,0)/guys.length;
      if(avgDelta>10){
        pills.push({emoji:"📈",text:"value hunter",detail:`+${Math.round(avgDelta)} avg`,color:"#16a34a"});
      }else if(avgDelta<-5){
        pills.push({emoji:"🎲",text:"reach drafter",detail:`${Math.round(avgDelta)} avg`,color:"#dc2626"});
      }else{
        pills.push({emoji:"⚖️",text:"consensus aligned",detail:`${avgDelta>0?"+":""}${Math.round(avgDelta)}`,color:"#525252"});
      }

      // 5. Conference leans
      const confCounts={};
      guys.forEach(g=>{const conf=SCHOOL_CONFERENCE[g.school];if(conf&&conf!=="FCS"&&conf!=="D2"&&conf!=="D3"&&conf!=="Ind")confCounts[conf]=(confCounts[conf]||0)+1;});
      const topConf=Object.entries(confCounts).sort((a,b)=>b[1]-a[1]);
      if(topConf.length>0&&topConf[0][1]>=Math.ceil(guys.length*0.5)){
        pills.push({emoji:"🏈",text:`${topConf[0][0]} lean`,detail:`${topConf[0][1]}/${guys.length}`,color:"#0369a1"});
      }

      // 6. School repeats
      const schoolCounts={};
      guys.forEach(g=>{if(g.school)schoolCounts[g.school]=(schoolCounts[g.school]||0)+1;});
      const repeats=Object.entries(schoolCounts).filter(([,c])=>c>=2).sort((a,b)=>b[1]-a[1]);
      if(repeats.length>0){
        const[sch,cnt]=repeats[0];
        pills.push({emoji:"🏫",text:`${sch} pipeline`,detail:`${cnt}`,color:"#7c3aed"});
      }

      return pills.slice(0,6);
    })();

    return(<div style={{minHeight:"100vh",background:"#faf9f6",fontFamily:font}}>
      <SaveBar/>
      <div style={{maxWidth:720,margin:"0 auto",padding:"52px 24px 60px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:16,marginBottom:8}}>
          <div>
            <div style={{display:"flex",alignItems:"center",gap:12}}>
              <h1 style={{fontSize:32,fontWeight:900,color:"#171717",margin:0,letterSpacing:-1}}>my guys</h1>
              {myGuys.length>0&&<button onClick={shareMyGuys} style={{fontFamily:sans,fontSize:12,fontWeight:700,padding:"8px 18px",background:"transparent",border:"1px solid #e5e5e5",borderRadius:99,cursor:"pointer",display:"inline-flex",alignItems:"center",gap:5,flexShrink:0,position:"relative"}}><span style={{display:"inline-flex",alignItems:"center",gap:5,visibility:copiedShare==="my-guys"?"hidden":"visible"}}>🖼️<span className="shimmer-text">share my guys</span></span>{copiedShare==="my-guys"&&<span style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",color:"#a3a3a3",fontWeight:400}}>copied</span>}</button>}
            </div>
            <p style={{fontFamily:sans,fontSize:13,color:"#737373",margin:"4px 0 0",lineHeight:1.5}}>the prospects you bang the table for every time you mock</p>
          </div>
          <button onClick={()=>setShowMyGuys(false)} style={{fontFamily:sans,fontSize:12,padding:"8px 16px",background:"transparent",border:"1px solid #e5e5e5",borderRadius:99,cursor:"pointer",color:"#a3a3a3",whiteSpace:"nowrap",flexShrink:0}}>← back</button>
        </div>
        <p style={{fontFamily:mono,fontSize:10,letterSpacing:1.5,color:"#a3a3a3",textTransform:"uppercase",margin:"0 0 12px"}}>{mockCount} mock{mockCount!==1?"s":""} completed · {myGuys.length}/10 guys identified</p>

        {/* Scouting Fingerprint */}
        {fingerprint.length>0&&<div style={{marginBottom:16}}>
          <div style={{fontFamily:mono,fontSize:9,letterSpacing:1.5,color:"#a3a3a3",textTransform:"uppercase",marginBottom:8}}>scouting fingerprint</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
            {fingerprint.map((pill,i)=><span key={i} style={{fontFamily:sans,fontSize:11,fontWeight:600,color:pill.color,background:`${pill.color}0d`,border:`1px solid ${pill.color}22`,padding:"4px 10px",borderRadius:99,display:"inline-flex",alignItems:"center",gap:4,whiteSpace:"nowrap"}}>
              <span>{pill.emoji}</span>
              <span>{pill.text}</span>
              {pill.detail&&<span style={{fontFamily:mono,fontSize:9,opacity:0.7}}>({pill.detail})</span>}
            </span>)}
          </div>
        </div>}

        {/* 2x5 grid */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(280px, 1fr))",gap:12}}>
          {myGuys.map((g,i)=>{
            const c=POS_COLORS[g.pos]||"#525252";
            const prospect=PROSPECTS.find(p=>p.name===g.name);
            const traitPos=g.pos==="DB"?(getProspectStats(g.name)?.gpos||"CB"):g.pos==="OL"?"OT":g.pos;
            const traitKeys=TRAIT_MAP[traitPos]||TRAIT_MAP["QB"];
            const traitVals=traitKeys.map(t=>tv(traits,prospect?.id,t,g.name,prospect?.school||"")/100);
            // Spider chart SVG
            const cx=60,cy=60,r=45,n=traitKeys.length;
            const points=(vals)=>vals.map((v,j)=>{const a=(Math.PI*2*j/n)-Math.PI/2;return[cx+r*v*Math.cos(a),cy+r*v*Math.sin(a)];});
            const poly=(pts)=>pts.map(p=>p.join(",")).join(" ");
            const gridLevels=[0.25,0.5,0.75,1];

            return<div key={g.name} style={{background:"#fff",border:"1px solid #e5e5e5",borderRadius:14,padding:16,cursor:"pointer",transition:"border-color 0.15s"}} onClick={()=>{if(prospect){openProfile(prospect);}}} onMouseEnter={e=>e.currentTarget.style.borderColor=c} onMouseLeave={e=>e.currentTarget.style.borderColor="#e5e5e5"}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                <span style={{fontFamily:font,fontSize:18,fontWeight:900,color:"#d4d4d4"}}>{i+1}</span>
                <SchoolLogo school={prospect?.school||""} size={24}/>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontFamily:sans,fontSize:14,fontWeight:700,color:"#171717",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{g.name}</div>
                  <div style={{fontFamily:mono,fontSize:10,color:"#a3a3a3"}}>{prospect?.school||""}</div>
                </div>
                <span style={{fontFamily:mono,fontSize:10,fontWeight:600,color:c,background:`${c}0d`,padding:"2px 8px",borderRadius:4}}>{g.pos}</span>
              </div>

              {/* Spider chart */}
              <svg viewBox="0 0 120 120" style={{width:"100%",maxWidth:160,margin:"0 auto",display:"block"}}>
                {gridLevels.map(lv=><polygon key={lv} points={poly(points(traitKeys.map(()=>lv)))} fill="none" stroke="#e5e5e5" strokeWidth={lv===1?0.8:0.4}/>)}
                {traitKeys.map((t,j)=>{const a=(Math.PI*2*j/n)-Math.PI/2;const lx=cx+r*1.18*Math.cos(a);const ly=cy+r*1.18*Math.sin(a);return<text key={t} x={lx} y={ly} textAnchor="middle" dominantBaseline="central" style={{fontSize:3.5,fill:"#a3a3a3",fontFamily:mono}}>{t.split(" ")[0]}</text>;})}
                <polygon points={poly(points(traitVals))} fill={`${c}20`} stroke={c} strokeWidth={1.2}/>
                {points(traitVals).map(([px,py],j)=><circle key={j} cx={px} cy={py} r={1.5} fill={c}/>)}
              </svg>

              {/* Stats row */}
              <div style={{display:"flex",justifyContent:"space-between",marginTop:8,padding:"8px 0 0",borderTop:"1px solid #f5f5f5"}}>
                <div style={{textAlign:"center"}}>
                  <div style={{fontFamily:mono,fontSize:8,color:"#a3a3a3",textTransform:"uppercase",letterSpacing:1}}>you pick</div>
                  <div style={{fontFamily:font,fontSize:16,fontWeight:900,color:"#171717"}}>{g.avgPick}</div>
                </div>
                <div style={{textAlign:"center"}}>
                  <div style={{fontFamily:mono,fontSize:8,color:"#a3a3a3",textTransform:"uppercase",letterSpacing:1}}>consensus</div>
                  <div style={{fontFamily:font,fontSize:16,fontWeight:900,color:"#a3a3a3"}}>{g.consensusRank}</div>
                </div>
                <div style={{textAlign:"center"}}>
                  <div style={{fontFamily:mono,fontSize:8,color:"#a3a3a3",textTransform:"uppercase",letterSpacing:1}}>score</div>
                  <div style={{fontFamily:font,fontSize:16,fontWeight:900,color:"#171717"}}>{g.score}</div>
                </div>
                <div style={{textAlign:"center"}}>
                  <div style={{fontFamily:mono,fontSize:8,color:"#a3a3a3",textTransform:"uppercase",letterSpacing:1}}>drafted</div>
                  <div style={{fontFamily:font,fontSize:16,fontWeight:900,color:"#171717"}}>{g.timesDrafted}x</div>
                </div>
              </div>
            </div>;
          })}

          {/* Empty slots */}
          {emptySlots.map((_,i)=><div key={`empty${i}`} style={{background:"#faf9f6",border:"2px dashed #e5e5e5",borderRadius:14,padding:16,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:200}}>
            <div style={{fontFamily:font,fontSize:24,fontWeight:900,color:"#e5e5e5"}}>{myGuys.length+i+1}</div>
            <div style={{fontFamily:sans,fontSize:11,color:"#d4d4d4",textAlign:"center",marginTop:4}}>mock more to discover</div>
          </div>)}
        </div>

        {myGuys.length>0&&<div style={{textAlign:"center",marginTop:24}}>
          <button onClick={shareMyGuys} style={{fontFamily:sans,fontSize:13,fontWeight:700,padding:"12px 28px",background:"transparent",border:"1px solid #e5e5e5",borderRadius:99,cursor:"pointer",display:"inline-flex",alignItems:"center",gap:6,position:"relative"}}><span style={{display:"inline-flex",alignItems:"center",gap:6,visibility:copiedShare==="my-guys"?"hidden":"visible"}}>🖼️<span className="shimmer-text">share my guys</span></span>{copiedShare==="my-guys"&&<span style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",color:"#a3a3a3",fontWeight:400}}>copied</span>}</button>
        </div>}
      </div>
      {profilePlayer&&<PlayerProfile player={profilePlayer} traits={traits} setTraits={setTraits} notes={notes} setNotes={setNotes} allProspects={PROSPECTS} getGrade={getGrade} onClose={closeProfile} onSelectPlayer={setProfilePlayer} consensus={CONSENSUS} ratings={ratings} isGuest={isGuest} onRequireAuth={onRequireAuth}/>}
    </div>);
  }

  if(phase==="home"||phase==="pick-position"){
    const hasBoardData=rankedGroups.size>0||Object.keys(partialProgress).length>0;
    const hasStaleData=!hasBoardData&&Object.keys(ratings).length>0&&!sessionStorage.getItem('bbl_stale_dismissed');
    const dismissStale=()=>{sessionStorage.setItem('bbl_stale_dismissed','1');setRatings({});setTraits({});setCompCount({});setWinCount({});};
    const dismissOnboarding=()=>{setShowOnboarding(false);try{localStorage.setItem('bbl_onboarded','1');}catch(e){}};

    // Consensus big board — all prospects sorted by consensus rank
    const consensusBoard=[...PROSPECTS].sort((a,b)=>{const ga=getScoutingGrade(a.id),gb=getScoutingGrade(b.id);if(gb!==ga)return gb-ga;return getConsensusRank(a.name)-getConsensusRank(b.name);});
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
          <span>📊 view depth chart updates post-draft and share your results</span><br/>
          <span onClick={onOpenGuide} style={{color:"#7c3aed",cursor:"pointer",fontWeight:600}}>see everything you can do →</span>
        </div>
        <button onClick={dismissOnboarding} style={{fontFamily:sans,fontSize:14,color:"#a3a3a3",background:"none",border:"none",cursor:"pointer",flexShrink:0,padding:"4px",marginTop:-2}}>✕</button>
      </div>
    </div>}

    {/* Header */}
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginBottom:16}}>
      <div>
        <h1 style={{fontSize:"clamp(28px,6vw,40px)",fontWeight:900,color:"#171717",margin:"0 0 2px",letterSpacing:-1.5}}>big board lab</h1>
        <p style={{fontFamily:mono,fontSize:8,letterSpacing:2,color:"#a3a3a3",textTransform:"uppercase",margin:0}}>2026 NFL Draft · April 23–25</p>
      </div>
      <button onClick={()=>{if(isGuest){onRequireAuth("want to see and share the guys you draft more than others?");return;}setShowMyGuys(true);setMyGuysUpdated(false);}} style={{fontFamily:sans,fontSize:12,fontWeight:600,padding:"8px 16px",background:myGuysUpdated?"linear-gradient(135deg,#ec4899,#7c3aed)":mockCount>0?"#171717":"transparent",color:myGuysUpdated||mockCount>0?"#fff":"#a3a3a3",border:myGuysUpdated||mockCount>0?"none":"1px solid #e5e5e5",borderRadius:99,cursor:"pointer",position:"relative",transition:"all 0.2s",whiteSpace:"nowrap"}}>
        👀 my guys
        {myGuysUpdated&&<span style={{position:"absolute",top:-2,right:-2,width:8,height:8,borderRadius:4,background:"#ec4899",border:"2px solid #faf9f6"}}/>}
      </button>
    </div>

    {/* Stale data warning */}
    {hasStaleData&&<div style={{background:"#fef3c7",border:"1px solid #fcd34d",borderRadius:12,padding:"12px 16px",marginBottom:16,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
      <span style={{fontFamily:sans,fontSize:13,color:"#92400e"}}>You have rankings from an old session. Reset to start fresh.</span>
      <button onClick={dismissStale} style={{fontFamily:sans,fontSize:11,fontWeight:700,padding:"6px 14px",background:"#171717",color:"#faf9f6",border:"none",borderRadius:99,cursor:"pointer",flexShrink:0,marginLeft:12}}>reset</button>
    </div>}

    {/* Mock Draft Launcher — primary CTA for new and returning users */}
    {(()=>{
      const topTeams=["Raiders","Jets","Cardinals","Titans","Giants","Browns","Commanders","Saints","Chiefs","Bengals","Dolphins","Cowboys","Rams","Ravens","Buccaneers","Lions","Vikings","Panthers","Steelers","Chargers","Eagles","Bears","Bills","49ers","Texans","Broncos","Patriots","Seahawks","Falcons","Colts","Packers","Jaguars"];
      const launchMock=()=>{
        setShowMockDraft(true);
        setMockLaunchTeam(mockTeamSet);
        trackEvent(user?.id,'mock_draft_cta_click',{teams:[...mockTeamSet].join(','),rounds:mockRounds,speed:mockSpeed,guest:!user});
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
      {boardFilter.size===1&&(()=>{const rawPos=[...boardFilter][0];const posTraits=POSITION_TRAITS[rawPos]||[];if(!posTraits.length)return null;const c=POS_COLORS[rawPos]||"#525252";const relevantIds=filteredBoard.map(p=>p.id);return<div className="trait-pills-scroll" style={{display:"flex",gap:4,padding:"0 16px 6px",overflowX:"auto",WebkitOverflowScrolling:"touch",flexWrap:"nowrap",scrollbarWidth:"none"}}>{posTraits.map(trait=>{const active=boardTraitFilter.has(trait);const count=relevantIds.filter(id=>qualifiesForFilter(id,rawPos,trait)).length;return<button key={trait} onClick={()=>setBoardTraitFilter(prev=>{const n=new Set(prev);n.has(trait)?n.delete(trait):n.add(trait);return n;})} style={{fontFamily:mono,fontSize:9,padding:"3px 8px",background:active?c+"18":"transparent",color:active?"#171717":"#525252",border:"1px solid "+(active?c+"44":c+"25"),borderRadius:99,cursor:"pointer",flexShrink:0,display:"flex",alignItems:"center",gap:3,whiteSpace:"nowrap"}}><span>{TRAIT_EMOJI[trait]}</span><span>{TRAIT_SHORT[trait]||trait}</span><span style={{fontSize:8,opacity:0.7}}>({count})</span></button>;})}</div>;})()}

      {/* Board content */}
      {boardTab==="my"&&userBoard.length===0?(
        /* My Big Board empty state — inline CTA */
        <div style={{padding:"40px 24px",textAlign:"center"}}>
          <div style={{fontSize:40,marginBottom:12}}>⚖️</div>
          <h3 style={{fontFamily:font,fontSize:20,fontWeight:900,color:"#171717",margin:"0 0 8px"}}>build your board</h3>
          {(()=>{const targetPos=boardFilter.size===1?[...boardFilter][0]:POSITION_GROUPS.find(pos=>!rankedGroups.has(pos))||"QB";return<>
          <p style={{fontFamily:sans,fontSize:14,color:"#737373",margin:"0 0 6px",maxWidth:380,marginLeft:"auto",marginRight:"auto",lineHeight:1.5}}>
            pick A or B in head-to-head matchups to rank prospects your way. start with {targetPos}s — it only takes a few minutes.
          </p>
          {rankedGroups.size>0&&<p style={{fontFamily:mono,fontSize:11,color:"#22c55e",margin:"0 0 16px"}}>{rankedGroups.size} position{rankedGroups.size!==1?"s":""} ranked so far</p>}
          <button onClick={()=>{startRanking(targetPos);}} style={{fontFamily:sans,fontSize:14,fontWeight:700,padding:"12px 28px",background:"#171717",color:"#faf9f6",border:"none",borderRadius:99,cursor:"pointer"}}>rank {targetPos}s →</button>
          <p style={{fontFamily:sans,fontSize:11,color:"#a3a3a3",margin:"12px 0 0"}}>or pick any position below</p>
          </>;})()}
        </div>
      ):(
        /* Board list */
        <div style={boardShowAll?{}:{maxHeight:480,overflowY:"auto"}}>
          {(boardShowAll?filteredBoard:filteredBoard.slice(0,100)).map((p,i)=>{
            const grade=boardTab==="consensus"?getScoutingGrade(p.id):getGrade(p.id);
            const c=POS_COLORS[p.gpos||p.pos]||POS_COLORS[p.pos]||"#525252";
            const rank=i+1;
            const gpos=(p.gpos||p.pos)==="K"||(p.gpos||p.pos)==="P"||(p.gpos||p.pos)==="LS"?"K/P":(p.gpos||p.pos);
            const isGrayed=boardTraitFilter.size>0&&boardFilter.size===1&&![...boardTraitFilter].some(t=>qualifiesForFilter(p.id,[...boardFilter][0],t));
            return<div key={p.id} style={{display:"flex",alignItems:"center",padding:"8px 16px",borderBottom:"1px solid #f8f8f6",cursor:"pointer",opacity:isGrayed?0.3:1,transition:"opacity 0.15s"}} onClick={()=>openProfile(p)} onMouseEnter={e=>e.currentTarget.style.background="#faf9f6"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
              <div style={{width:80,flexShrink:0,display:"flex",alignItems:"center",gap:8}}>
                <span style={{fontFamily:mono,fontSize:11,color:"#d4d4d4",width:22,textAlign:"right",flexShrink:0}}>{rank}</span>
                <span style={{fontFamily:mono,fontSize:9,fontWeight:600,color:c,background:`${c}0d`,padding:"2px 7px",borderRadius:4}}>{p.gpos||p.pos}</span>
              </div>
              <SchoolLogo school={p.school} size={20}/>
              <div style={{flex:1,minWidth:0,marginLeft:10,display:"flex",alignItems:"center",gap:4}}>
                <span style={{fontFamily:sans,fontSize:13,fontWeight:700,color:"#171717"}}>{p.name}</span>
                <span style={{fontFamily:mono,fontSize:10,color:"#a3a3a3",marginLeft:6}}>{p.school}</span>
                {(boardTraitFilter.size>0?(prospectBadges[p.id]||[]).filter(b=>boardTraitFilter.has(b.trait)):(prospectBadges[p.id]||[])).map(b=><span key={b.trait} title={b.trait+" "+b.score} className={boardTraitFilter.size>0?"":"board-badge"} style={{fontFamily:mono,fontSize:7,fontWeight:700,color:c,background:c+"0d",padding:"2px 4px",borderRadius:3,flexShrink:0}}>{b.emoji}</span>)}
              </div>
              {grade&&<span style={{fontFamily:font,fontSize:14,fontWeight:900,color:grade>=75?"#16a34a":grade>=55?"#ca8a04":"#dc2626",flexShrink:0}}>{grade}</span>}
            </div>;
          })}
          <div style={{padding:"12px 16px",textAlign:"center"}}><button onClick={()=>setBoardShowAll(v=>!v)} style={{fontFamily:mono,fontSize:10,color:"#525252",background:"none",border:"1px solid #e5e5e5",borderRadius:99,padding:"5px 14px",cursor:"pointer"}}>{boardShowAll?`show less`:`view all ${filteredBoard.length} prospects`}</button></div>
        </div>
      )}
      <style>{`@media(max-width:600px){.board-badge{display:none!important;}}`}</style>

      {/* Board footer */}
      {boardTab==="my"&&userBoard.length>0&&(()=>{
        const filterArr=boardFilter.size>0?POSITION_GROUPS.filter(pos=>boardFilter.has(pos)):POSITION_GROUPS;
        const contPos=filterArr.find(pos=>!rankedGroups.has(pos)&&partialProgress[pos])||POSITION_GROUPS.find(pos=>!rankedGroups.has(pos)&&partialProgress[pos]);
        const nextPos=filterArr.find(pos=>!rankedGroups.has(pos)&&!partialProgress[pos])||POSITION_GROUPS.find(pos=>!rankedGroups.has(pos)&&!partialProgress[pos]);
        return<div style={{padding:"10px 16px",borderTop:"1px solid #f0f0f0",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <span style={{fontFamily:mono,fontSize:10,color:"#a3a3a3"}}>{rankedGroups.size}/{POSITION_GROUPS.length} positions · {userBoard.length} prospects</span>
          <div style={{display:"flex",gap:8}}>
            {rankedGroups.size>=POSITION_GROUPS.length?
              <button onClick={()=>setPhase("board")} style={{fontFamily:sans,fontSize:11,fontWeight:700,color:"#171717",background:"none",border:"1px solid #e5e5e5",borderRadius:99,padding:"5px 14px",cursor:"pointer"}}>full board view →</button>
            :contPos?
              <button onClick={()=>{startRanking(contPos,true);}} style={{fontFamily:sans,fontSize:11,fontWeight:700,color:"#faf9f6",background:"#171717",border:"none",borderRadius:99,padding:"5px 14px",cursor:"pointer"}}>continue {contPos}s →</button>
            :nextPos?
              <button onClick={()=>{startRanking(nextPos);}} style={{fontFamily:sans,fontSize:11,fontWeight:700,color:"#faf9f6",background:"#171717",border:"none",borderRadius:99,padding:"5px 14px",cursor:"pointer"}}>rank {nextPos}s →</button>
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
          {!done&&!partial&&<button onClick={()=>{startRanking(pos);}} style={{fontFamily:sans,fontSize:12,fontWeight:700,padding:"7px 18px",background:"#171717",color:"#faf9f6",border:"none",borderRadius:99,cursor:"pointer"}}>{POS_EMOJI[pos]||""} rank</button>}
          {partial&&!done&&<>
            <button onClick={()=>{setActivePos(pos);setSelectedPlayer(getRanked(pos)[0]);setPhase("traits");}} style={{fontFamily:sans,fontSize:12,fontWeight:700,padding:"7px 18px",background:`${c}11`,color:c,border:`1px solid ${c}33`,borderRadius:99,cursor:"pointer"}}>✓ rankings</button>
            <button onClick={()=>{startRanking(pos,true);}} style={{fontFamily:sans,fontSize:11,padding:"7px 14px",background:"#171717",color:"#faf9f6",border:"none",borderRadius:99,cursor:"pointer"}}>continue</button>
          </>}
          {done&&<>
            <button onClick={()=>{setActivePos(pos);setSelectedPlayer(getRanked(pos)[0]);setPhase("traits");}} style={{fontFamily:sans,fontSize:12,fontWeight:700,padding:"7px 18px",background:reviewed?`${c}11`:"#171717",color:reviewed?c:"#faf9f6",border:reviewed?`1px solid ${c}33`:"none",borderRadius:99,cursor:"pointer"}}>{reviewed?"✓ rankings":"rankings"}</button>
          </>}
        </div>
      </div>);})}</div>
    {rankedGroups.size>0&&<div style={{textAlign:"center",marginTop:32}}><button onClick={()=>setPhase("board")} style={{fontFamily:sans,fontSize:14,fontWeight:700,padding:"14px 36px",background:"#171717",color:"#faf9f6",border:"none",borderRadius:99,cursor:"pointer"}}>view big board ({rankedGroups.size}/{POSITION_GROUPS.length})</button></div>}

    <div style={{textAlign:"center",padding:"48px 24px 24px",fontFamily:mono,fontSize:10,color:"#d4d4d4",letterSpacing:0.5}}>© {new Date().getFullYear()} Big Board Lab, LLC. All rights reserved.</div>
    </div>{profilePlayer&&<PlayerProfile player={profilePlayer} traits={traits} setTraits={setTraits} notes={notes} setNotes={setNotes} allProspects={PROSPECTS} getGrade={getGrade} onClose={closeProfile} onSelectPlayer={setProfilePlayer} consensus={CONSENSUS} ratings={ratings} isGuest={isGuest} onRequireAuth={onRequireAuth}/>}</div>);
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
})()}<div style={{display:"flex",gap:12,marginBottom:24,alignItems:"stretch",position:"relative"}}><div style={{position:"absolute",left:"50%",top:"50%",transform:"translate(-50%,-50%)",zIndex:2,fontFamily:font,fontSize:16,fontWeight:900,color:"#d4d4d4",background:"#faf9f6",padding:"4px 10px",borderRadius:99,border:"1px solid #e5e5e5"}}>vs</div>{[{p:pA,id:aId},{p:pB,id:bId}].map(({p,id})=>{const ps=getProspectStats(p.name,p.school);return<button key={id} onClick={()=>{if(showConfidence)return;if(isGuest){onRequireAuth("sign in to vote and build your big board");return;}setPendingWinner(id);setShowConfidence(true);}} style={{flex:1,padding:"24px 16px 20px",background:pendingWinner===id?`${c}08`:"#fff",border:pendingWinner===id?`2px solid ${c}`:"1px solid #e5e5e5",borderRadius:16,cursor:showConfidence?"default":"pointer",textAlign:"center",transition:"all 0.15s",display:"flex",flexDirection:"column",alignItems:"center",gap:4}} onMouseEnter={e=>{if(!showConfidence)e.currentTarget.style.borderColor=c;}} onMouseLeave={e=>{if(!showConfidence&&pendingWinner!==id)e.currentTarget.style.borderColor="#e5e5e5";}}><SchoolLogo school={p.school} size={44}/><div style={{fontFamily:font,fontSize:20,fontWeight:900,color:"#171717",lineHeight:1.1,marginTop:2}}>{p.name}</div><div style={{fontFamily:mono,fontSize:11,color:"#a3a3a3"}}>{p.school}</div><div style={{display:"flex",gap:6,alignItems:"center",marginTop:2}}><span style={{fontFamily:mono,fontSize:10,fontWeight:500,color:c,background:`${c}0d`,padding:"3px 10px",borderRadius:4,border:`1px solid ${c}1a`}}>{p.gpos||p.pos}</span>{ps&&<span style={{fontFamily:mono,fontSize:10,color:"#a3a3a3"}}>{ps.rank?"#"+ps.rank+" ovr":"NR"}{ps.posRank?" · "+(p.gpos||p.pos)+ps.posRank:""}</span>}</div>{ps&&(ps.height||ps.weight)&&<div style={{fontFamily:mono,fontSize:10,color:"#a3a3a3",marginTop:2}}>{[ps.height,ps.weight?ps.weight+"lbs":"",ps.cls?("yr "+ps.cls):""].filter(Boolean).join(" · ")}</div>}{ps&&ps.statLine&&<div style={{fontFamily:mono,fontSize:10,color:"#525252",marginTop:4,lineHeight:1.3,background:"#f9f9f6",padding:"4px 8px",borderRadius:6,border:"1px solid #f0f0f0",maxWidth:"100%"}}>{ps.statLine}{ps.statExtra&&<><br/><span style={{color:"#a3a3a3"}}>{ps.statExtra}</span></>}</div>}{(compCount[id]||0)>=2&&<div style={{fontFamily:mono,fontSize:9,color:"#a3a3a3",marginTop:4}}>{Math.round(((winCount[id]||0)/(compCount[id]))*100)}% pick rate</div>}</button>})}</div>{showConfidence&&<div style={{background:"#fff",border:"1px solid #e5e5e5",borderRadius:12,padding:"20px 24px",marginBottom:24,textAlign:"center"}}><p style={{fontFamily:sans,fontSize:13,fontWeight:700,color:"#171717",margin:"0 0 4px"}}>how confident?</p><p style={{fontFamily:sans,fontSize:12,color:"#a3a3a3",margin:"0 0 16px"}}>higher = bigger rating swing</p><div style={{display:"flex",gap:8,justifyContent:"center",flexWrap:"wrap"}}>{[["coin flip",.2],["leaning",.5],["confident",.75],["lock",1]].map(([label,val])=><button key={label} onClick={()=>handlePick(pendingWinner,val)} style={{fontFamily:sans,fontSize:12,fontWeight:600,padding:"8px 16px",background:val>=.75?"#171717":"transparent",color:val>=.75?"#faf9f6":"#525252",border:"1px solid #e5e5e5",borderRadius:99,cursor:"pointer"}} onMouseEnter={e=>{e.currentTarget.style.background="#171717";e.currentTarget.style.color="#faf9f6";}} onMouseLeave={e=>{if(val<.75){e.currentTarget.style.background="transparent";e.currentTarget.style.color="#525252";}}}>{label}</button>)}</div><button onClick={()=>{setShowConfidence(false);setPendingWinner(null);}} style={{fontFamily:sans,fontSize:11,color:"#a3a3a3",background:"none",border:"none",cursor:"pointer",marginTop:10}}>← pick again</button></div>}<div style={{background:"#fff",border:"1px solid #e5e5e5",borderRadius:12,padding:"16px 20px",marginBottom:16}}>{lockedPlayer&&(()=>{const lp=prospectsMap[lockedPlayer];const remLocked=(matchups[activePos]||[]).filter(m=>!((completed[activePos]||new Set()).has(`${m[0]}-${m[1]}`))&&(m[0]===lockedPlayer||m[1]===lockedPlayer));return<div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"8px 12px",marginBottom:12,background:"linear-gradient(135deg,#fef3c7,#fef9c3)",border:"1px solid #fbbf24",borderRadius:8}}><div style={{display:"flex",alignItems:"center",gap:8}}><span style={{fontSize:14}}>🎯</span><span style={{fontFamily:sans,fontSize:12,fontWeight:700,color:"#92400e"}}>{lp?.name} focus mode</span><span style={{fontFamily:mono,fontSize:10,color:"#b45309"}}>{remLocked.length} left</span></div><button onClick={()=>{setLockedPlayer(null);const ns=completed[activePos]||new Set();const next=getNextMatchup(matchups[activePos],ns,ratings,compCount,posRankFn,null);if(next)setCurrentMatchup(next);}} style={{fontFamily:sans,fontSize:10,fontWeight:600,padding:"4px 10px",background:"#fff",color:"#92400e",border:"1px solid #fbbf24",borderRadius:99,cursor:"pointer"}}>unlock</button></div>;})()}<p style={{fontFamily:mono,fontSize:10,letterSpacing:2,color:"#a3a3a3",textTransform:"uppercase",margin:"0 0 10px"}}>live rankings</p><div style={{maxHeight:400,overflowY:"auto"}}>{ranked.map((p,i)=>{const isLocked=lockedPlayer===p.id;return<div key={p.id} className="rank-row" style={{display:"flex",alignItems:"center",gap:10,padding:"5px 0",borderBottom:i<ranked.length-1?"1px solid #f5f5f5":"none",background:isLocked?"#fef9c3":"transparent",borderRadius:isLocked?4:0,margin:isLocked?"0 -4px":"0",padding:isLocked?"5px 4px":"5px 0"}}><span style={{fontFamily:mono,fontSize:11,color:"#d4d4d4",width:20,textAlign:"right"}}>{i+1}</span><SchoolLogo school={p.school} size={20}/><span style={{fontFamily:sans,fontSize:13,fontWeight:600,color:"#171717",flex:1,cursor:"pointer",textDecoration:"none"}} onClick={e=>{e.stopPropagation();setProfilePlayer(p);}} onMouseEnter={e=>e.currentTarget.style.textDecoration="underline"} onMouseLeave={e=>e.currentTarget.style.textDecoration="none"}>{p.name}</span><span style={{fontFamily:mono,fontSize:11,color:"#a3a3a3"}}>{Math.round(ratings[p.id]||1500)}</span><button onClick={e=>{e.stopPropagation();if(isLocked){setLockedPlayer(null);const ns=completed[activePos]||new Set();const next=getNextMatchup(matchups[activePos],ns,ratings,compCount,posRankFn,null);if(next)setCurrentMatchup(next);}else{setLockedPlayer(p.id);const ns=completed[activePos]||new Set();const next=getNextMatchup(matchups[activePos],ns,ratings,compCount,posRankFn,p.id);if(next)setCurrentMatchup(next);else setLockedPlayer(null);}}} title={isLocked?"Unlock":"Focus matchups on this player"} style={{fontSize:12,background:"none",border:"none",cursor:"pointer",padding:"2px 4px",opacity:isLocked?1:0,transition:"opacity 0.15s",flexShrink:0}} className="lock-btn">{isLocked?"🎯":"📌"}</button></div>;})}</div><style>{`.rank-row:hover .lock-btn{opacity:1!important;}@media(max-width:768px){.lock-btn{display:none!important;}.reorder-hint-desktop{display:none!important;}.reorder-hint-mobile{display:inline!important;}}`}</style></div><button onClick={()=>{setLockedPlayer(null);const done=completed[activePos]||new Set();if(done.size>0){setPartialProgress(prev=>({...prev,[activePos]:{matchups:matchups[activePos]||[],completed:done,ratings}}));}setPhase("pick-position");}} style={{fontFamily:sans,fontSize:12,color:"#a3a3a3",background:"none",border:"1px solid #e5e5e5",borderRadius:99,padding:"8px 20px",cursor:"pointer"}}>← save & exit</button></div>{profilePlayer&&<PlayerProfile player={profilePlayer} traits={traits} setTraits={setTraits} notes={notes} setNotes={setNotes} allProspects={PROSPECTS} getGrade={getGrade} onClose={closeProfile} onSelectPlayer={setProfilePlayer} consensus={CONSENSUS} ratings={ratings} isGuest={isGuest} onRequireAuth={onRequireAuth}/>}</div>);}

  // === TRAITS ===
  if(phase==="traits"&&activePos){const ranked=getRanked(activePos);const posTraits=POSITION_TRAITS[activePos]||[];const c=POS_COLORS[activePos];const cur=selectedPlayer||ranked[0];const curIdx=ranked.findIndex(p=>p.id===cur?.id);return(<div style={{minHeight:"100vh",background:"#faf9f6",fontFamily:font}}><SaveBar/><div style={{maxWidth:900,margin:"0 auto",padding:"52px 24px 40px"}}><div style={{display:"flex",alignItems:"center",gap:12,margin:"0 0 4px"}}><h1 style={{fontSize:28,fontWeight:900,color:c,margin:0}}>{activePos} rankings</h1><button onClick={()=>sharePositionTop10(activePos)} style={{fontFamily:sans,fontSize:12,fontWeight:700,padding:"8px 18px",background:"transparent",border:"1px solid #e5e5e5",borderRadius:99,cursor:"pointer",display:"inline-flex",alignItems:"center",gap:5,flexShrink:0,position:"relative"}}><span style={{display:"inline-flex",alignItems:"center",gap:5,visibility:copiedShare==="top10"?"hidden":"visible"}}>🖼️<span className="shimmer-text">share top 10</span></span>{copiedShare==="top10"&&<span style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",color:"#a3a3a3",fontWeight:400}}>copied</span>}</button></div><style>{`@media(max-width:768px){.reorder-hint-desktop{display:none!important;}.reorder-hint-mobile{display:inline!important;}}`}</style><p style={{fontFamily:sans,fontSize:13,color:"#a3a3a3",margin:"0 0 24px"}}><span className="reorder-hint-desktop">drag to reorder</span><span className="reorder-hint-mobile" style={{display:"none"}}>hold to reorder</span> · click name for full profile</p><div style={{display:"flex",gap:16,flexWrap:"wrap"}}><DraggableRankList ranked={ranked} activePos={activePos} cur={cur} c={c} getGrade={getGrade} setSelectedPlayer={setSelectedPlayer} movePlayer={movePlayer} setProfilePlayer={setProfilePlayer} font={font} mono={mono} sans={sans} isGuest={isGuest} onRequireAuth={onRequireAuth}/>{cur&&<div style={{flex:"1 1 300px",minWidth:260,background:"#fff",border:"1px solid #e5e5e5",borderRadius:12,padding:24}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20,paddingBottom:16,borderBottom:"1px solid #f5f5f5"}}><div style={{display:"flex",alignItems:"center",gap:14}}><SchoolLogo school={cur.school} size={44}/><div><div style={{fontFamily:font,fontSize:24,fontWeight:900,color:"#171717",cursor:"pointer"}} onClick={()=>setProfilePlayer(cur)} onMouseEnter={e=>e.currentTarget.style.textDecoration="underline"} onMouseLeave={e=>e.currentTarget.style.textDecoration="none"}>{cur.name}</div><div style={{fontFamily:mono,fontSize:12,color:"#a3a3a3"}}>{cur.school}</div></div></div><div style={{textAlign:"right"}}><div style={{fontFamily:font,fontSize:36,fontWeight:900,color:getGrade(cur.id)>=75?"#16a34a":getGrade(cur.id)>=55?"#ca8a04":"#dc2626",lineHeight:1}}>{getGrade(cur.id)}</div><div style={{fontFamily:mono,fontSize:9,letterSpacing:2,color:"#a3a3a3",textTransform:"uppercase"}}>grade</div></div></div><div style={{display:"flex",justifyContent:"center",marginBottom:16}}><RadarChart traits={posTraits} values={posTraits.map(t=>tv(traits,cur.id,t,cur.name,cur.school))} color={c} size={220}/></div>{(()=>{const ceil=traits[cur.id]?.__ceiling||"normal";const m={capped:{icon:"🔒",label:"Capped",color:"#737373",bg:"#f5f5f5"},normal:{icon:"📊",label:"Normal",color:"#64748b",bg:"#f0f4ff"},high:{icon:"🔥",label:"High Ceiling",color:"#b45309",bg:"#fef3c7"},elite:{icon:"⭐",label:"Elite Ceiling",color:"#7c3aed",bg:"#f3e8ff"}};const s=m[ceil]||m.normal;return ceil!=="normal"?<div style={{marginBottom:12,paddingBottom:12,borderBottom:"1px solid #f0f0f0"}}><div style={{display:"inline-flex",alignItems:"center",gap:6,padding:"4px 12px",background:s.bg,borderRadius:99}}><span style={{fontSize:13}}>{s.icon}</span><span style={{fontFamily:mono,fontSize:11,fontWeight:700,color:s.color}}>{s.label}</span></div></div>:null;})()}<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"8px 16px"}}>{posTraits.map(trait=>{const val=tv(traits,cur.id,trait,cur.name,cur.school);return<div key={trait} style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><span style={{fontFamily:mono,fontSize:11,color:"#737373"}}>{TRAIT_EMOJI[trait]||""} {trait}</span><span style={{fontFamily:font,fontSize:14,fontWeight:900,color:`rgb(${Math.round(236+(124-236)*(val/100))},${Math.round(72+(58-72)*(val/100))},${Math.round(153+(237-153)*(val/100))})`}}>{val}</span></div>;})}</div>{notes[cur.id]&&<div style={{marginTop:16,padding:"10px 12px",background:"#faf9f6",borderRadius:8,border:"1px solid #f0f0f0"}}><div style={{fontFamily:mono,fontSize:9,color:"#a3a3a3",letterSpacing:1,textTransform:"uppercase",marginBottom:4}}>notes</div><div style={{fontFamily:sans,fontSize:12,color:"#525252",lineHeight:1.5}}>{notes[cur.id]}</div></div>}<div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:20,paddingTop:16,borderTop:"1px solid #f5f5f5"}}><button onClick={()=>curIdx>0&&setSelectedPlayer(ranked[curIdx-1])} disabled={curIdx<=0} style={{fontFamily:sans,fontSize:12,padding:"7px 16px",background:"transparent",border:"1px solid #e5e5e5",borderRadius:99,cursor:curIdx>0?"pointer":"default",color:curIdx>0?"#525252":"#d4d4d4"}}>← prev</button><span style={{fontFamily:mono,fontSize:11,color:"#a3a3a3"}}>{curIdx+1} / {ranked.length}</span><button onClick={()=>curIdx<ranked.length-1&&setSelectedPlayer(ranked[curIdx+1])} disabled={curIdx>=ranked.length-1} style={{fontFamily:sans,fontSize:12,padding:"7px 16px",background:"transparent",border:"1px solid #e5e5e5",borderRadius:99,cursor:curIdx<ranked.length-1?"pointer":"default",color:curIdx<ranked.length-1?"#525252":"#d4d4d4"}}>next →</button></div></div>}</div><div style={{display:"flex",gap:10,marginTop:20,justifyContent:"center",flexWrap:"wrap"}}>
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
</div></div>{profilePlayer&&<PlayerProfile player={profilePlayer} traits={traits} setTraits={setTraits} notes={notes} setNotes={setNotes} allProspects={PROSPECTS} getGrade={getGrade} onClose={closeProfile} onSelectPlayer={setProfilePlayer} consensus={CONSENSUS} ratings={ratings} isGuest={isGuest} onRequireAuth={onRequireAuth}/>}</div>);}

  // === RECONCILE ===
  if(phase==="reconcile"&&reconcileQueue.length>0){const item=reconcileQueue[Math.min(reconcileIndex,reconcileQueue.length-1)];const c=POS_COLORS[item.player.pos];const dir=item.gradeRank<item.pairRank?"higher":"lower";return(<div style={{minHeight:"100vh",background:"#faf9f6",fontFamily:font}}><SaveBar/><div style={{maxWidth:500,margin:"0 auto",padding:"52px 24px"}}><p style={{fontFamily:mono,fontSize:10,letterSpacing:2,color:"#a3a3a3",textTransform:"uppercase",margin:"0 0 4px"}}>reconcile · {reconcileIndex+1} of {reconcileQueue.length}</p><div style={{height:3,background:"#e5e5e5",borderRadius:2,marginBottom:28,overflow:"hidden"}}><div style={{height:"100%",width:`${((reconcileIndex+1)/reconcileQueue.length)*100}%`,background:c,borderRadius:2}}/></div><div style={{background:"#fff",border:"1px solid #e5e5e5",borderRadius:16,padding:32,textAlign:"center"}}><SchoolLogo school={item.player.school} size={56}/><div style={{fontFamily:font,fontSize:28,fontWeight:900,color:c,marginBottom:4,marginTop:8}}>{item.player.name}</div><div style={{fontFamily:mono,fontSize:12,color:"#a3a3a3",marginBottom:24}}>{item.player.school}</div><div style={{display:"flex",justifyContent:"center",gap:32,marginBottom:24}}>{[["gut rank",`#${item.pairRank}`,"#171717"],["grade rank",`#${item.gradeRank}`,dir==="higher"?"#16a34a":"#dc2626"],["composite",`${item.grade}`,"#171717"]].map(([label,val,col])=><div key={label}><div style={{fontFamily:mono,fontSize:9,letterSpacing:1.5,color:"#a3a3a3",textTransform:"uppercase",marginBottom:4}}>{label}</div><div style={{fontFamily:font,fontSize:28,fontWeight:900,color:col}}>{val}</div></div>)}</div><p style={{fontFamily:sans,fontSize:14,color:"#737373",lineHeight:1.5,marginBottom:24}}>your traits suggest this player should rank <strong style={{color:dir==="higher"?"#16a34a":"#dc2626"}}>{dir}</strong> than your gut. accept?</p><div style={{display:"flex",gap:10,justifyContent:"center"}}><button onClick={()=>{const pos=item.player.pos;const rk=getRanked(pos);const ti=item.gradeRank-1;const tp=rk[ti];if(tp)setRatings(prev=>({...prev,[item.player.id]:(prev[tp.id]||1500)+(dir==="higher"?1:-1)}));reconcileIndex>=reconcileQueue.length-1?setPhase("pick-position"):setReconcileIndex(reconcileIndex+1);}} style={{fontFamily:sans,fontSize:13,fontWeight:700,padding:"10px 24px",background:"#171717",color:"#faf9f6",border:"none",borderRadius:99,cursor:"pointer"}}>accept</button><button onClick={()=>reconcileIndex>=reconcileQueue.length-1?setPhase("pick-position"):setReconcileIndex(reconcileIndex+1)} style={{fontFamily:sans,fontSize:13,padding:"10px 24px",background:"transparent",color:"#737373",border:"1px solid #e5e5e5",borderRadius:99,cursor:"pointer"}}>keep my rank</button></div></div></div></div>);}

  // === BIG BOARD ===
  if(phase==="board")return(<div><SaveBar/><div style={{paddingTop:32}}><BoardView getBoard={getBoard} getGrade={getGrade} rankedGroups={rankedGroups} setPhase={setPhase} setSelectedPlayer={setSelectedPlayer} setActivePos={setActivePos} traits={traits} compareList={compareList} setCompareList={setCompareList} setProfilePlayer={setProfilePlayer} setShowMockDraft={setShowMockDraft} communityBoard={communityBoard} setCommunityBoard={setCommunityBoard} ratings={ratings} byPos={byPos} traitThresholds={traitThresholds} qualifiesForFilter={qualifiesForFilter} prospectBadges={prospectBadges} sharePositionTop10={sharePositionTop10} copiedShare={copiedShare}/></div>{profilePlayer&&<PlayerProfile player={profilePlayer} traits={traits} setTraits={setTraits} notes={notes} setNotes={setNotes} allProspects={PROSPECTS} getGrade={getGrade} onClose={closeProfile} onSelectPlayer={setProfilePlayer} consensus={CONSENSUS} ratings={ratings} isGuest={isGuest} onRequireAuth={onRequireAuth}/>}</div>);

  return(<>{profilePlayer&&<PlayerProfile player={profilePlayer} traits={traits} setTraits={setTraits} notes={notes} setNotes={setNotes} allProspects={PROSPECTS} getGrade={getGrade} onClose={closeProfile} onSelectPlayer={setProfilePlayer} consensus={CONSENSUS} ratings={ratings} isGuest={isGuest} onRequireAuth={onRequireAuth}/>}</>);
}

function DraggableRankList({ranked,activePos,cur,c,getGrade,setSelectedPlayer,movePlayer,setProfilePlayer,font,mono,sans,isGuest,onRequireAuth}){
  const[dragIdx,setDragIdx]=useState(null);
  const[overIdx,setOverIdx]=useState(null);
  // Touch long-press drag support
  const touchState=useRef({timer:null,dragging:false,startIdx:null,startY:0,currentIdx:null});
  const listRef=useRef(null);
  const handleDragStart=(e,i)=>{if(isGuest){e.preventDefault();onRequireAuth("sign in to reorder your rankings");return;}setDragIdx(i);e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',i);};
  const handleDragOver=(e,i)=>{e.preventDefault();e.dataTransfer.dropEffect='move';setOverIdx(i);};
  const handleDrop=(e,i)=>{e.preventDefault();if(dragIdx!==null&&dragIdx!==i)movePlayer(activePos,dragIdx,i);setDragIdx(null);setOverIdx(null);};
  const handleDragEnd=()=>{setDragIdx(null);setOverIdx(null);};
  const getIdxFromY=(y)=>{if(!listRef.current)return null;const rows=listRef.current.children;for(let i=0;i<rows.length;i++){const r=rows[i].getBoundingClientRect();if(y>=r.top&&y<=r.bottom)return i;}return null;};
  const handleTouchStart=(e,i)=>{if(isGuest)return;const ts=touchState.current;ts.startY=e.touches[0].clientY;ts.startIdx=i;ts.timer=setTimeout(()=>{ts.dragging=true;setDragIdx(i);if(navigator.vibrate)navigator.vibrate(30);},400);};
  const handleTouchMove=(e)=>{const ts=touchState.current;if(!ts.dragging){if(ts.timer&&Math.abs(e.touches[0].clientY-ts.startY)>8){clearTimeout(ts.timer);ts.timer=null;}return;}e.preventDefault();const idx=getIdxFromY(e.touches[0].clientY);if(idx!==null&&idx!==ts.currentIdx){ts.currentIdx=idx;setOverIdx(idx);}};
  const handleTouchEnd=()=>{const ts=touchState.current;if(ts.timer){clearTimeout(ts.timer);ts.timer=null;}if(ts.dragging&&ts.startIdx!==null&&ts.currentIdx!==null&&ts.startIdx!==ts.currentIdx){movePlayer(activePos,ts.startIdx,ts.currentIdx);}ts.dragging=false;ts.startIdx=null;ts.currentIdx=null;setDragIdx(null);setOverIdx(null);};
  return(
    <div style={{flex:"1 1 260px",minWidth:220,maxWidth:400,background:"#fff",border:"1px solid #e5e5e5",borderRadius:12,overflow:"hidden"}}>
      <div style={{fontFamily:mono,fontSize:10,letterSpacing:2,color:"#a3a3a3",textTransform:"uppercase",padding:"12px 16px 4px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <span>rankings</span>{!isGuest&&<><span className="reorder-hint-desktop" style={{fontSize:9,letterSpacing:1,color:"#d4d4d4",fontWeight:400}}>drag to reorder</span><span className="reorder-hint-mobile" style={{fontSize:9,letterSpacing:1,color:"#d4d4d4",fontWeight:400,display:"none"}}>hold to reorder</span></>}
      </div>
      <div ref={listRef} style={{maxHeight:480,overflowY:"auto"}}>
        {ranked.map((p,i)=>(
          <div key={p.id} draggable={!isGuest} onDragStart={e=>handleDragStart(e,i)} onDragOver={e=>handleDragOver(e,i)} onDrop={e=>handleDrop(e,i)} onDragEnd={handleDragEnd}
            onTouchStart={e=>handleTouchStart(e,i)} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}
            onClick={()=>setSelectedPlayer(p)}
            style={{display:"flex",alignItems:"center",gap:6,padding:"7px 12px 7px 8px",borderLeft:cur?.id===p.id?`3px solid ${c}`:"3px solid transparent",background:dragIdx===i?"#f0f0f0":overIdx===i&&dragIdx!==null?`${c}0a`:cur?.id===p.id?`${c}06`:"transparent",cursor:isGuest?"pointer":"grab",userSelect:"none",borderBottom:overIdx===i&&dragIdx!==null?`2px solid ${c}`:"1px solid transparent",transition:"background 0.1s",opacity:dragIdx===i?0.5:1}}>
            {!isGuest&&<span style={{fontFamily:mono,fontSize:9,color:"#d4d4d4",cursor:"grab",padding:"0 2px",flexShrink:0}}>⠿</span>}
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

function BoardView({getBoard,getGrade,rankedGroups,setPhase,setSelectedPlayer,setActivePos,traits,compareList,setCompareList,setProfilePlayer,setShowMockDraft,communityBoard,setCommunityBoard,ratings,byPos,traitThresholds,qualifiesForFilter,prospectBadges,sharePositionTop10,copiedShare}){
  const[filterPos,setFilterPos]=useState(new Set());const[traitFilter,setTraitFilter]=useState(new Set());useEffect(()=>{setTraitFilter(new Set());},[filterPos]);const[showCommunity,setShowCommunity]=useState(false);const board=getBoard();let display=filterPos.size>0?board.filter(p=>filterPos.has(p.gpos||p.pos)):board;if(traitFilter.size>0&&filterPos.size===1){const pos=[...filterPos][0];display=display.filter(p=>[...traitFilter].some(t=>qualifiesForFilter(p.id,pos,t)));}
  const compPlayers=compareList.map(id=>board.find(p=>p.id===id)).filter(Boolean);
  const samePos=compPlayers.length>=2&&compPlayers.every(p=>p.pos===compPlayers[0].pos);
  const compColors=["#2563eb","#dc2626","#16a34a","#f59e0b"];
  const[showCompareTip,setShowCompareTip]=useState(()=>{try{return!localStorage.getItem('bbl_compare_tip_seen');}catch(e){return true;}});
  const dismissCompareTip=()=>{setShowCompareTip(false);try{localStorage.setItem('bbl_compare_tip_seen','1');}catch(e){}};

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

  const activeSinglePos=filterPos.size===1?[...filterPos][0]:null;
  return(<div style={{minHeight:"100vh",background:"#faf9f6",fontFamily:font}}><div style={{maxWidth:800,margin:"0 auto",padding:"40px 24px"}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}><div style={{display:"flex",alignItems:"center",gap:12,minWidth:0}}><h1 style={{fontSize:36,fontWeight:900,color:activeSinglePos?(POS_COLORS[activeSinglePos]||"#171717"):"#171717",margin:0,letterSpacing:-1,whiteSpace:"nowrap"}}>{activeSinglePos?`${activeSinglePos} rankings`:"big board"}</h1>{filterPos.size<=1&&display.length>0&&<button onClick={()=>sharePositionTop10(activeSinglePos)} style={{fontFamily:sans,fontSize:12,fontWeight:700,padding:"8px 18px",background:"transparent",border:"1px solid #e5e5e5",borderRadius:99,cursor:"pointer",display:"inline-flex",alignItems:"center",gap:5,flexShrink:0,position:"relative"}}><span style={{display:"inline-flex",alignItems:"center",gap:5,visibility:copiedShare==="top10"?"hidden":"visible"}}>🖼️<span className="shimmer-text">share top 10</span></span>{copiedShare==="top10"&&<span style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",color:"#a3a3a3",fontWeight:400}}>copied</span>}</button>}</div><button onClick={()=>setPhase("pick-position")} style={{fontFamily:sans,fontSize:12,padding:"8px 16px",background:"transparent",border:"1px solid #e5e5e5",borderRadius:99,cursor:"pointer",color:"#a3a3a3",whiteSpace:"nowrap",flexShrink:0}}>← back</button></div><p style={{fontFamily:sans,fontSize:13,color:"#a3a3a3",margin:"0 0 12px"}}>{display.length} prospects ranked by you</p>

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

    <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:filterPos.size===1?6:20}}><button onClick={()=>setFilterPos(new Set())} style={{fontFamily:mono,fontSize:11,padding:"5px 14px",background:filterPos.size===0?"#171717":"transparent",color:filterPos.size===0?"#faf9f6":"#a3a3a3",border:"1px solid #e5e5e5",borderRadius:99,cursor:"pointer"}}>all</button>{POSITION_GROUPS.filter(p=>rankedGroups.has(p)).map(pos=>{const active=filterPos.has(pos);return<button key={pos} onClick={()=>setFilterPos(prev=>{const n=new Set(prev);if(n.has(pos))n.delete(pos);else n.add(pos);return n;})} style={{fontFamily:mono,fontSize:11,padding:"5px 14px",background:active?`${POS_COLORS[pos]}11`:"transparent",color:active?POS_COLORS[pos]:"#a3a3a3",border:`1px solid ${active?POS_COLORS[pos]+"33":"#e5e5e5"}`,borderRadius:99,cursor:"pointer"}}>{pos}</button>;})}</div>
    {filterPos.size===1&&(()=>{const rawPos=[...filterPos][0];const posTraits=POSITION_TRAITS[rawPos]||[];if(!posTraits.length)return null;const c=POS_COLORS[rawPos]||"#525252";const relevantIds=board.map(p=>p.id);return<div className="trait-pills-scroll" style={{display:"flex",gap:4,padding:"0 0 12px",overflowX:"auto",WebkitOverflowScrolling:"touch",flexWrap:"nowrap",scrollbarWidth:"none"}}>{posTraits.map(trait=>{const active=traitFilter.has(trait);const count=relevantIds.filter(id=>qualifiesForFilter(id,rawPos,trait)).length;return<button key={trait} onClick={()=>setTraitFilter(prev=>{const n=new Set(prev);n.has(trait)?n.delete(trait):n.add(trait);return n;})} style={{fontFamily:mono,fontSize:9,padding:"3px 8px",background:active?c+"18":"transparent",color:active?"#171717":"#525252",border:"1px solid "+(active?c+"44":c+"25"),borderRadius:99,cursor:"pointer",flexShrink:0,display:"flex",alignItems:"center",gap:3,whiteSpace:"nowrap"}}><span>{TRAIT_EMOJI[trait]}</span><span>{TRAIT_SHORT[trait]||trait}</span><span style={{fontSize:8,opacity:0.7}}>({count})</span></button>;})}</div>;})()}
    {showCompareTip&&compareList.length===0&&<div style={{background:"linear-gradient(135deg,#fdf4ff,#f5f3ff)",border:"1px solid #e9d5ff",borderRadius:12,padding:"12px 16px",marginBottom:16,display:"flex",alignItems:"center",justifyContent:"space-between"}}><span style={{fontFamily:sans,fontSize:13,color:"#7c3aed"}}>💡 Click rows to compare up to 4 prospects head-to-head on traits</span><button onClick={dismissCompareTip} style={{fontFamily:sans,fontSize:11,color:"#a3a3a3",background:"none",border:"none",cursor:"pointer",flexShrink:0}}>✕</button></div>}{compareList.length>0&&<div style={{background:"#fff",border:"1px solid #e5e5e5",borderRadius:12,padding:16,marginBottom:16}}>
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
          {compPlayers.map((p,ci)=>{const posTraits=POSITION_TRAITS[p.pos]||[];return<div key={p.id} style={{position:"relative",display:"flex",flexDirection:"column",alignItems:"center"}}>
            <RadarChart traits={posTraits} values={posTraits.map(t=>tv(traits,p.id,t,p.name,p.school))} color={compColors[ci]} size={160}/>
            <div style={{fontFamily:mono,fontSize:9,color:compColors[ci],whiteSpace:"nowrap",marginTop:-4}}>{shortName(p.name)}</div>
          </div>;})}
        </div>
        <div style={{marginTop:12}}>
          {(POSITION_TRAITS[compPlayers[0].pos]||[]).map(trait=><div key={trait} style={{display:"grid",gridTemplateColumns:`100px repeat(${compPlayers.length},1fr)`,gap:8,padding:"4px 0",borderBottom:"1px solid #f8f8f8",alignItems:"center"}}>
            <span style={{fontFamily:mono,fontSize:10,color:"#a3a3a3"}}>{trait}</span>
            {compPlayers.map((p,ci)=>{const val=tv(traits,p.id,trait,p.name,p.school);const best=Math.max(...compPlayers.map(cp=>tv(traits,cp.id,trait,cp.name,cp.school)));const worst=Math.min(...compPlayers.map(cp=>tv(traits,cp.id,trait,cp.name,cp.school)));return<div key={p.id} style={{textAlign:"center"}}>
              <span style={{fontFamily:font,fontSize:13,fontWeight:700,color:compPlayers.length>1&&val===best&&best!==worst?compColors[ci]:compPlayers.length>1&&val===worst&&best!==worst?"#d4d4d4":"#525252"}}>{val}</span>
            </div>;})}
          </div>)}
        </div>
      </>}
      {!samePos&&compPlayers.length>=2&&<div style={{fontFamily:sans,fontSize:11,color:"#a3a3a3",textAlign:"center",marginTop:12,fontStyle:"italic"}}>select players at the same position for trait comparison & spider charts</div>}
    </div>}<div style={{background:"#fff",border:"1px solid #e5e5e5",borderRadius:12,overflow:"hidden"}}>{display.map((p,i)=>{const grade=getGrade(p.id);const c=POS_COLORS[p.gpos||p.pos]||POS_COLORS[p.pos];const cIdx=compareList.indexOf(p.id);const isC=cIdx>=0;return<div key={p.id} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 16px",borderBottom:i<display.length-1?"1px solid #f5f5f5":"none",cursor:"pointer",background:isC?`${compColors[cIdx]}08`:"transparent"}} onMouseEnter={e=>{if(!isC)e.currentTarget.style.background=`${c}06`;}} onMouseLeave={e=>{if(!isC)e.currentTarget.style.background="transparent";}} onClick={()=>{if(showCompareTip)dismissCompareTip();if(isC)setCompareList(prev=>prev.filter(id=>id!==p.id));else if(compareList.length<4)setCompareList(prev=>[...prev,p.id]);}} onDoubleClick={()=>{setSelectedPlayer(p);setActivePos(p.gpos||p.pos);setPhase("traits");}}>{isC&&<div style={{width:6,height:6,borderRadius:99,background:compColors[cIdx],flexShrink:0}}/>}<div style={{width:84,flexShrink:0,display:"flex",alignItems:"center",gap:8}}><span style={{fontFamily:mono,fontSize:12,color:"#d4d4d4",width:24,textAlign:"right",flexShrink:0}}>{i+1}</span><span style={{fontFamily:mono,fontSize:10,fontWeight:500,color:c,background:`${c}0d`,padding:"2px 8px",borderRadius:4}}>{p.gpos||p.pos}</span></div><SchoolLogo school={p.school} size={24}/><div style={{flex:1,minWidth:0,marginLeft:10}}><span style={{fontFamily:sans,fontSize:14,fontWeight:700,color:"#171717",cursor:"pointer"}} onClick={e=>{e.stopPropagation();setProfilePlayer(p);}} onMouseEnter={e=>e.currentTarget.style.textDecoration="underline"} onMouseLeave={e=>e.currentTarget.style.textDecoration="none"}>{p.name}</span><span style={{fontFamily:mono,fontSize:11,color:"#a3a3a3",marginLeft:8}}>{p.school}</span>{(traitFilter.size>0?(prospectBadges[p.id]||[]).filter(b=>traitFilter.has(b.trait)):(prospectBadges[p.id]||[])).map(b=><span key={b.trait} title={b.trait+" "+b.score} className={traitFilter.size>0?"":"board-badge"} style={{fontFamily:mono,fontSize:7,fontWeight:700,color:c,background:c+"0d",padding:"2px 4px",borderRadius:3,flexShrink:0,marginLeft:4}}>{b.emoji}</span>)}</div>{(()=>{const pk=(p.gpos||p.pos)==="K"||(p.gpos||p.pos)==="P"||(p.gpos||p.pos)==="LS"?"K/P":(p.gpos||p.pos);const pt=POSITION_TRAITS[pk]||[];return pt.length>=3?<MiniRadar values={pt.map(t=>tv(traits,p.id,t,p.name,p.school))} color={c} size={28}/>:null;})()}<span style={{fontFamily:font,fontSize:14,fontWeight:900,color:grade>=75?"#16a34a":grade>=55?"#ca8a04":"#dc2626",width:24,textAlign:"right",flexShrink:0}}>{grade}</span></div>;})}</div><p style={{fontFamily:sans,fontSize:11,color:"#a3a3a3",textAlign:"center",marginTop:16}}>click name for profile · click row to compare (up to 4) · double-click to edit</p><style>{`@media(max-width:600px){.board-badge{display:none!important;}.mini-radar{display:none!important;}}`}</style></div></div>);
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
  const[excludeAdmin,setExcludeAdmin]=useState(true);
  const[allEventsRaw,setAllEventsRaw]=useState([]);
  const[showEventLog,setShowEventLog]=useState(false);
  const[expandedUser,setExpandedUser]=useState(null);
  useEffect(()=>{
    (async()=>{
      try{
        // Fetch from all sources in parallel
        const fourteenAgo=new Date(Date.now()-14*86400000).toISOString();
        const[boardsRes,communityRes,evtsRes,heatmapRes,authCountRes,authUsersRes]=await Promise.all([
          supabase.from('boards').select('user_id,board_data,updated_at'),
          supabase.from('community_boards').select('user_id,board_data'),
          supabase.from('events').select('*').order('created_at',{ascending:false}).limit(5000),
          supabase.from('events').select('created_at,user_id,session_id').gte('created_at',fourteenAgo).limit(50000),
          supabase.rpc('get_auth_user_count'),
          supabase.rpc('get_auth_users_summary'),
        ]);
        const boards=boardsRes.data||[];
        const community=communityRes.data||[];
        const allEventsData=evtsRes.data||[];
        const adminId=user?.id;
        const allEventsFiltered=adminId?allEventsData.filter(e=>e.user_id!==adminId):allEventsData;
        // Fix historical signup inflation — only keep 1 signup per user, relabel rest as login
        // Events are desc by created_at, so collect all signup indices per user, keep only the last (earliest)
        const signupIndices={};
        allEventsFiltered.forEach((e,i)=>{if(e.event==='signup'){if(!signupIndices[e.user_id])signupIndices[e.user_id]=[];signupIndices[e.user_id].push(i);}});
        const relabelSet=new Set();
        Object.values(signupIndices).forEach(idxs=>{idxs.slice(0,-1).forEach(i=>relabelSet.add(i));});
        const allEvents=allEventsFiltered.map((e,i)=>relabelSet.has(i)?{...e,event:'login'}:e);
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
          const mockCount=userEvts.filter(e=>e.event==='mock_draft_completed').length;
          const shareCount=userEvts.filter(e=>e.event==='share_results'||e.event==='share_triggered').length;
          const rankingsStartedU=userEvts.filter(e=>e.event==='ranking_started').length;
          const rankingsCompletedU=userEvts.filter(e=>e.event==='ranking_completed').length;
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
            rankedGroups:rg,
            partialPositions:pp.length,
            partialGroups:pp,
            noteCount,
            eventCount:userEvts.length,
            mockCount,
            shareCount,
            rankingsStartedU,
            rankingsCompletedU,
            hasBoard:!!b,
          };
        }).sort((a,b)=>new Date(b.updatedAt)-new Date(a.updatedAt));

        // Synthetic "Anonymous Visitors" row from guest events
        const anonEvtsAll=allEvents.filter(e=>e.user_id===null||e.user_id===undefined||e.metadata?.guest===true);
        if(anonEvtsAll.length>0){
          const anonMocks=anonEvtsAll.filter(e=>e.event==='mock_draft_completed').length;
          const anonShares=anonEvtsAll.filter(e=>e.event==='share_results'||e.event==='share_triggered').length;
          const anonRankStarted=anonEvtsAll.filter(e=>e.event==='ranking_started').length;
          const anonRankCompleted=anonEvtsAll.filter(e=>e.event==='ranking_completed').length;
          const anonLast=anonEvtsAll[0];
          const anonSessions=new Set(anonEvtsAll.map(e=>e.session_id).filter(Boolean)).size;
          userDetails.unshift({
            userId:'__anonymous__',
            email:`anonymous visitors (${anonSessions} sessions)`,
            createdAt:anonEvtsAll[anonEvtsAll.length-1]?.created_at,
            updatedAt:anonLast?anonLast.created_at:null,
            rankedPositions:0,rankedGroups:[],partialPositions:0,partialGroups:[],noteCount:0,
            eventCount:anonEvtsAll.length,
            mockCount:anonMocks,shareCount:anonShares,
            rankingsStartedU:anonRankStarted,rankingsCompletedU:anonRankCompleted,
            hasBoard:false,isAnon:true,
          });
        }

        const rankers=userDetails.filter(u=>u.rankedPositions>0);
        const avgPositions=rankers.length>0?(rankers.reduce((s,u)=>s+u.rankedPositions,0)/rankers.length).toFixed(1):0;

        // Activity heatmap (last 14 days) — from dedicated date-filtered query
        const heatmapEvents=heatmapRes.data||[];
        const dayMap={};
        heatmapEvents.forEach(e=>{
          const d=new Date(e.created_at).toISOString().slice(0,10);
          dayMap[d]=(dayMap[d]||0)+1;
        });
        const heatmap=Array.from({length:14},(_,i)=>{
          const d=new Date(now-(13-i)*86400000).toISOString().slice(0,10);
          return{date:d,count:dayMap[d]||0};
        });

        // Signup heatmap (last 14 days) — from auth user created_at
        const signupDayMap={};
        authUsers.forEach(u=>{if(u.created_at){const d=new Date(u.created_at).toISOString().slice(0,10);if(d>=fourteenAgo.slice(0,10))signupDayMap[d]=(signupDayMap[d]||0)+1;}});
        const signupHeatmap=Array.from({length:14},(_,i)=>{
          const d=new Date(now-(13-i)*86400000).toISOString().slice(0,10);
          return{date:d,count:signupDayMap[d]||0};
        });

        // Anonymous sessions heatmap (last 14 days) — unique session_ids per day
        const anonSessionDayMap={};
        heatmapEvents.filter(e=>!e.user_id).forEach(e=>{
          const d=new Date(e.created_at).toISOString().slice(0,10);
          if(!anonSessionDayMap[d])anonSessionDayMap[d]=new Set();
          if(e.session_id)anonSessionDayMap[d].add(e.session_id);
        });
        const anonSessionHeatmap=Array.from({length:14},(_,i)=>{
          const d=new Date(now-(13-i)*86400000).toISOString().slice(0,10);
          return{date:d,count:anonSessionDayMap[d]?anonSessionDayMap[d].size:0};
        });

        // Feature usage stats
        const rankingsStarted=allEvents.filter(e=>e.event==='ranking_started').length;
        const mocksStarted=allEvents.filter(e=>e.event==='mock_draft_sim_started'||e.event==='mock_draft_started').length;
        const mocksCompleted=allEvents.filter(e=>e.event==='mock_draft_completed').length;
        const mockCompletedEvents=allEvents.filter(e=>e.event==='mock_draft_completed');
        const singleTeamMocks=mockCompletedEvents.filter(e=>{const t=e.metadata?.team||'';return t&&!t.includes(',');}).length;
        const multiTeamMocks=mockCompletedEvents.filter(e=>{const t=e.metadata?.team||'';return t&&t.includes(',');}).length;
        const allTeamMocks=mockCompletedEvents.filter(e=>{const t=e.metadata?.team||'';return t&&t.split(',').length>=32;}).length;
        const shareEvents=allEvents.filter(e=>e.event==='share_results'||e.event==='share_triggered');
        const totalShares=shareEvents.length;
        const shareUsers=new Set(shareEvents.map(e=>e.user_id)).size;
        const shareByType={};
        shareEvents.forEach(e=>{const t=e.metadata?.type||'mock_single';shareByType[t]=(shareByType[t]||0)+1;});
        const noteUsers=boards.filter(b=>{const d=b.board_data||{};return d.notes&&Object.keys(d.notes).length>0;}).length;

        // Guest / anonymous activity (all-time + last 7 days)
        const anonEvents=allEvents.filter(e=>e.user_id===null||e.user_id===undefined||e.metadata?.guest===true);
        const weekAgo=new Date(now-604800000);
        const anonWeek=anonEvents.filter(e=>new Date(e.created_at)>=weekAgo);
        const guestMocksStarted=anonEvents.filter(e=>e.event==='mock_draft_sim_started'||e.event==='mock_draft_started').length;
        const guestMocksCompleted=anonEvents.filter(e=>e.event==='mock_draft_completed').length;
        const guestShares=anonEvents.filter(e=>e.event==='share_results').length;
        const guestMocksWeek=anonWeek.filter(e=>e.event==='mock_draft_sim_started'||e.event==='mock_draft_started').length;
        const guestTeams={};
        anonEvents.filter(e=>e.event==='mock_draft_sim_started'||e.event==='mock_draft_started').forEach(e=>{
          const t=e.metadata?.team||e.metadata?.teams;if(t){guestTeams[t]=(guestTeams[t]||0)+1;}
        });
        const guestTopTeams=Object.entries(guestTeams).sort((a,b)=>b[1]-a[1]).slice(0,5);

        // Signup flow inference — look at each user's first event to determine entry point
        const signupFlows={};
        const signupEvents=allEvents.filter(e=>e.event==='signup');
        signupEvents.forEach(se=>{
          const source=se.metadata?.source;
          if(source){signupFlows[source]=(signupFlows[source]||0)+1;return;}
          // Infer from first non-signup event for this user
          const firstEvt=allEvents.filter(e=>e.user_id===se.user_id&&e.event!=='signup'&&e.event!=='login').pop();
          const flow=firstEvt?
            (firstEvt.event==='mock_draft_started'||firstEvt.event==='mock_draft_sim_started'||firstEvt.event==='mock_draft_completed'?'mock draft':
            firstEvt.event==='ranking_started'||firstEvt.event==='ranking_completed'?'pair rank':
            firstEvt.event==='share_results'||firstEvt.event==='share_triggered'?'share':
            'homepage'):'homepage';
          signupFlows[flow]=(signupFlows[flow]||0)+1;
        });

        // Funnel step counts — guest activity is true top of funnel
        const funnelVisited=guestMocksStarted+totalUsers;
        const funnelSignedUp=totalUsers;
        const funnelRankedPos=new Set([...allEvents.filter(e=>e.event==='ranking_completed').map(e=>e.user_id),...boards.filter(b=>(b.board_data?.rankedGroups||[]).length>0).map(b=>b.user_id)]).size;
        const funnelRanMock=new Set(allEvents.filter(e=>e.event==='mock_draft_started'||e.event==='mock_draft_completed').filter(e=>e.user_id).map(e=>e.user_id)).size;
        const funnelShared=new Set(allEvents.filter(e=>e.event==='share_triggered'||e.event==='share_results').filter(e=>e.user_id).map(e=>e.user_id)).size;

        setStats({totalUsers,activeToday,activeWeek,posStats,partialCount,avgPositions,hasNotes,
          communityUsers:community.length,eventCounts,uniqueEventUsers,signupsToday,signupsWeek,
          mockDrafts,mockDraftUsers,rankingsCompleted,
          heatmap,signupHeatmap,anonSessionHeatmap,rankingsStarted,mocksStarted,mocksCompleted,singleTeamMocks,multiTeamMocks,allTeamMocks,totalShares,shareUsers,shareByType,noteUsers,
          guestMocksStarted,guestMocksCompleted,guestShares,guestMocksWeek,guestTopTeams,
          signupFlows,
          funnelVisited,funnelSignedUp,funnelRankedPos,funnelRanMock,funnelShared,
        });
        setUsers(userDetails);
        setAllEventsRaw(allEventsData);
        setEvents(allEvents.slice(0,50));
      }catch(e){console.error('Admin fetch error:',e);}
      setLoading(false);
    })();
  },[]);
  // Filter events/stats based on admin toggle (must be before early return)
  const adminId=user?.id;
  const displayEvents=excludeAdmin?events:(allEventsRaw||[]).slice(0,50);
  const displayEventCounts=useMemo(()=>{
    const raw=allEventsRaw||[];
    const src=excludeAdmin?raw.filter(e=>e.user_id!==adminId):raw;
    const counts={};src.forEach(e=>{counts[e.event]=(counts[e.event]||0)+1;});
    const unique={};src.forEach(e=>{if(!unique[e.event])unique[e.event]=new Set();unique[e.event].add(e.user_id);});
    return{counts,unique};
  },[excludeAdmin,allEventsRaw,adminId]);

  if(loading)return<div style={{minHeight:"100vh",background:"#faf9f6",display:"flex",alignItems:"center",justifyContent:"center"}}><p style={{fontFamily:sans,fontSize:14,color:"#a3a3a3"}}>loading admin...</p></div>;

  // Compute user status tags
  const tagUser=(u)=>{
    if(u.isAnon)return{label:"anonymous",color:"#737373",bg:"#f5f5f5"};
    const hasMocks=u.mockCount>0;
    if(u.rankedPositions>0&&hasMocks)return{label:"power user",color:"#16a34a",bg:"#f0fdf4"};
    if(hasMocks)return{label:"drafter",color:"#f59e0b",bg:"#fffbeb"};
    if(u.rankedPositions>0)return{label:"ranker",color:"#3b82f6",bg:"#eff6ff"};
    if(u.eventCount>2)return{label:"explorer",color:"#ca8a04",bg:"#fefce8"};
    return{label:"one-visit",color:"#d4d4d4",bg:"#fafafa"};
  };

  return(
    <div style={{minHeight:"100vh",background:"#faf9f6",fontFamily:font}}>
      <div style={{position:"fixed",top:0,left:0,right:0,zIndex:100,display:"flex",justifyContent:"space-between",alignItems:"center",padding:"6px 16px",background:"#171717",borderBottom:"1px solid #333"}}>
        <span style={{fontFamily:mono,fontSize:11,color:"#faf9f6",letterSpacing:2}}>⚙️ ADMIN DASHBOARD</span>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <label style={{display:"flex",alignItems:"center",gap:6,cursor:"pointer"}}>
            <input type="checkbox" checked={excludeAdmin} onChange={e=>setExcludeAdmin(e.target.checked)} style={{accentColor:"#22c55e"}}/>
            <span style={{fontFamily:mono,fontSize:9,color:excludeAdmin?"#22c55e":"#737373"}}>exclude admin</span>
          </label>
          <button onClick={onBack} style={{fontFamily:sans,fontSize:11,color:"#a3a3a3",background:"none",border:"1px solid #444",borderRadius:99,padding:"3px 12px",cursor:"pointer"}}>← back to app</button>
        </div>
      </div>
      <style>{`
        .admin-kpi{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:24px}
        .admin-2col{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:24px}
        .admin-table-head,.admin-table-row{display:grid;grid-template-columns:1fr 80px 70px 60px 100px;gap:4px}
        .admin-event-row{display:grid;grid-template-columns:110px 1fr 1fr 120px;gap:6px}
        @media(max-width:700px){
          .admin-kpi{grid-template-columns:repeat(2,1fr)}
          .admin-2col{grid-template-columns:1fr}
          .admin-table-head,.admin-table-row{grid-template-columns:1fr 60px 50px 40px}
          .admin-table-hide{display:none}
          .admin-event-row{grid-template-columns:90px 1fr 90px}
          .admin-event-meta{display:none}
        }
      `}</style>
      <div style={{maxWidth:920,margin:"0 auto",padding:"52px 24px 60px"}}>

        {/* SECTION 1: KPI Strip — 4 cards */}
        <div className="admin-kpi">
          {[
            {label:"Users",value:stats.totalUsers,sub:`+${stats.signupsWeek} this week`,color:"#171717"},
            {label:"Active (7d)",value:stats.activeWeek,sub:`${stats.activeToday} today`,color:"#3b82f6"},
            {label:"Mocks Run",value:stats.mocksCompleted,sub:`${stats.mockDraftUsers} users`,color:"#f59e0b"},
            {label:"Shared",value:stats.totalShares,sub:`${stats.shareUsers} users`,color:"#22c55e"},
          ].map(c=>(
            <div key={c.label} style={{background:"#fff",border:"1px solid #e5e5e5",borderRadius:10,padding:"16px 18px",textAlign:"center"}}>
              <div style={{fontFamily:font,fontSize:28,fontWeight:900,color:c.color,lineHeight:1}}>{c.value}</div>
              <div style={{fontFamily:mono,fontSize:8,letterSpacing:1.5,color:"#a3a3a3",textTransform:"uppercase",marginTop:6}}>{c.label}</div>
              <div style={{fontFamily:mono,fontSize:10,color:"#737373",marginTop:4}}>{c.sub}</div>
            </div>
          ))}
        </div>

        {/* SECTION 2: Conversion Funnel — step-over-step */}
        {(()=>{
          const steps=[
            {label:`Visited (${stats.guestMocksStarted} guests + ${stats.funnelSignedUp} signed up)`,count:stats.funnelVisited,color:"#a3a3a3"},
            {label:"Signed Up",count:stats.funnelSignedUp,color:"#171717"},
            {label:"Ranked a Position",count:stats.funnelRankedPos,color:"#3b82f6"},
            {label:"Ran a Mock Draft",count:stats.funnelRanMock,color:"#f59e0b"},
            {label:"Shared Results",count:stats.funnelShared,color:"#22c55e"},
          ];
          const topCount=steps[0].count||1;
          return<div style={{background:"#fff",border:"1px solid #e5e5e5",borderRadius:12,padding:"20px 24px",marginBottom:24}}>
            <div style={{fontFamily:mono,fontSize:9,letterSpacing:2,color:"#a3a3a3",textTransform:"uppercase",marginBottom:16}}>conversion funnel</div>
            {steps.map((step,i)=>{
              const prevCount=i>0?steps[i-1].count:step.count;
              const convPct=prevCount>0?Math.round(step.count/prevCount*100):0;
              const barW=topCount>0?Math.max(step.count/topCount*100,step.count>0?2:0):0;
              return<div key={step.label}>
                {i>0&&<div style={{fontFamily:mono,fontSize:10,color:"#a3a3a3",padding:"2px 0 2px 8px"}}>↓ {convPct}%</div>}
                <div style={{marginBottom:i<steps.length-1?4:0}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:3}}>
                    <span style={{fontFamily:sans,fontSize:13,fontWeight:600,color:"#171717"}}>{step.label}</span>
                    <span style={{fontFamily:mono,fontSize:13,fontWeight:900,color:step.color}}>{step.count}</span>
                  </div>
                  <div style={{height:6,background:"#f5f5f5",borderRadius:99,overflow:"hidden"}}>
                    <div style={{height:"100%",width:barW+"%",background:step.color,borderRadius:99,transition:"width 0.3s"}}/>
                  </div>
                </div>
              </div>;
            })}
          </div>;
        })()}

        {/* SECTION 3: Activity Heatmap — last 14 days */}
        {stats.heatmap&&<div style={{background:"#fff",border:"1px solid #e5e5e5",borderRadius:12,padding:"16px 20px",marginBottom:24}}>
          <div style={{fontFamily:mono,fontSize:9,letterSpacing:2,color:"#a3a3a3",textTransform:"uppercase",marginBottom:12}}>activity — last 14 days</div>
          <div style={{display:"flex",gap:4}}>
            {(()=>{
              const maxC=Math.max(...stats.heatmap.map(d=>d.count),1);
              return stats.heatmap.map(d=>{
                const intensity=d.count/maxC;
                const bg=d.count===0?"#f5f5f5":`rgba(34,197,94,${0.15+intensity*0.85})`;
                const dayLabel=new Date(d.date+'T12:00:00').toLocaleDateString('en-US',{weekday:'narrow'});
                const dateLabel=new Date(d.date+'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric'});
                return<div key={d.date} style={{flex:1,textAlign:"center"}} title={`${dateLabel}: ${d.count} events`}>
                  <div style={{height:36,background:bg,borderRadius:4,display:"flex",alignItems:"center",justifyContent:"center",marginBottom:3}}>
                    <span style={{fontFamily:mono,fontSize:d.count>0?11:9,fontWeight:700,color:d.count===0?"#d4d4d4":intensity>0.5?"#fff":"#166534"}}>{d.count||"·"}</span>
                  </div>
                  <div style={{fontFamily:mono,fontSize:8,color:"#a3a3a3"}}>{dayLabel}</div>
                </div>;
              });
            })()}
          </div>
        </div>}

        {stats.signupHeatmap&&<div style={{background:"#fff",border:"1px solid #e5e5e5",borderRadius:12,padding:"16px 20px",marginBottom:24}}>
          <div style={{fontFamily:mono,fontSize:9,letterSpacing:2,color:"#a3a3a3",textTransform:"uppercase",marginBottom:12}}>signups — last 14 days</div>
          <div style={{display:"flex",gap:4}}>
            {(()=>{
              const maxC=Math.max(...stats.signupHeatmap.map(d=>d.count),1);
              return stats.signupHeatmap.map(d=>{
                const intensity=d.count/maxC;
                const bg=d.count===0?"#f5f5f5":`rgba(124,58,237,${0.15+intensity*0.85})`;
                const dayLabel=new Date(d.date+'T12:00:00').toLocaleDateString('en-US',{weekday:'narrow'});
                const dateLabel=new Date(d.date+'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric'});
                return<div key={d.date} style={{flex:1,textAlign:"center"}} title={`${dateLabel}: ${d.count} signups`}>
                  <div style={{height:36,background:bg,borderRadius:4,display:"flex",alignItems:"center",justifyContent:"center",marginBottom:3}}>
                    <span style={{fontFamily:mono,fontSize:d.count>0?11:9,fontWeight:700,color:d.count===0?"#d4d4d4":intensity>0.5?"#fff":"#5b21b6"}}>{d.count||"·"}</span>
                  </div>
                  <div style={{fontFamily:mono,fontSize:8,color:"#a3a3a3"}}>{dayLabel}</div>
                </div>;
              });
            })()}
          </div>
        </div>}

        {stats.anonSessionHeatmap&&<div style={{background:"#fff",border:"1px solid #e5e5e5",borderRadius:12,padding:"16px 20px",marginBottom:24}}>
          <div style={{fontFamily:mono,fontSize:9,letterSpacing:2,color:"#a3a3a3",textTransform:"uppercase",marginBottom:12}}>anonymous visits — last 14 days</div>
          <div style={{display:"flex",gap:4}}>
            {(()=>{
              const maxC=Math.max(...stats.anonSessionHeatmap.map(d=>d.count),1);
              return stats.anonSessionHeatmap.map(d=>{
                const intensity=d.count/maxC;
                const bg=d.count===0?"#f5f5f5":`rgba(249,115,22,${0.15+intensity*0.85})`;
                const dayLabel=new Date(d.date+'T12:00:00').toLocaleDateString('en-US',{weekday:'narrow'});
                const dateLabel=new Date(d.date+'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric'});
                return<div key={d.date} style={{flex:1,textAlign:"center"}} title={`${dateLabel}: ${d.count} sessions`}>
                  <div style={{height:36,background:bg,borderRadius:4,display:"flex",alignItems:"center",justifyContent:"center",marginBottom:3}}>
                    <span style={{fontFamily:mono,fontSize:d.count>0?11:9,fontWeight:700,color:d.count===0?"#d4d4d4":intensity>0.5?"#fff":"#9a3412"}}>{d.count||"·"}</span>
                  </div>
                  <div style={{fontFamily:mono,fontSize:8,color:"#a3a3a3"}}>{dayLabel}</div>
                </div>;
              });
            })()}
          </div>
        </div>}

        {/* Guest Activity + Signup Flows — side by side */}
        <div className="admin-2col">
          <div style={{background:"#fff",border:"1px solid #e5e5e5",borderRadius:12,padding:"16px 20px"}}>
            <div style={{fontFamily:mono,fontSize:9,letterSpacing:2,color:"#a3a3a3",textTransform:"uppercase",marginBottom:10}}>guest activity</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
              {[["Mocks Started",stats.guestMocksStarted,"#737373"],["Mocks Completed",stats.guestMocksCompleted,"#525252"],["Shares",stats.guestShares,"#22c55e"]].map(([l,v,c])=>(
                <div key={l} style={{padding:"6px 12px",background:"#f9f9f7",borderRadius:6,textAlign:"center",minWidth:80}}>
                  <div style={{fontFamily:font,fontSize:18,fontWeight:900,color:c}}>{v}</div>
                  <div style={{fontFamily:mono,fontSize:8,color:"#a3a3a3"}}>{l}</div>
                </div>
              ))}
            </div>
            <div style={{fontFamily:mono,fontSize:9,color:"#a3a3a3",marginTop:8}}>{stats.guestMocksWeek} guest mocks this week</div>
            {stats.guestTopTeams?.length>0&&<div style={{marginTop:8}}>
              <div style={{fontFamily:mono,fontSize:8,color:"#a3a3a3",marginBottom:4}}>popular guest teams</div>
              <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
                {stats.guestTopTeams.map(([team,count])=>(
                  <span key={team} style={{fontFamily:mono,fontSize:9,padding:"2px 6px",background:"#f5f5f5",borderRadius:4,color:"#525252"}}>{team} ({count})</span>
                ))}
              </div>
            </div>}
          </div>
          <div style={{background:"#fff",border:"1px solid #e5e5e5",borderRadius:12,padding:"16px 20px"}}>
            <div style={{fontFamily:mono,fontSize:9,letterSpacing:2,color:"#a3a3a3",textTransform:"uppercase",marginBottom:10}}>signup flows</div>
            {Object.keys(stats.signupFlows||{}).length>0?<div style={{display:"flex",flexDirection:"column",gap:6}}>
              {Object.entries(stats.signupFlows).sort((a,b)=>b[1]-a[1]).map(([flow,count])=>{
                const total=Object.values(stats.signupFlows).reduce((s,v)=>s+v,0);
                const pct=total>0?Math.round(count/total*100):0;
                return<div key={flow} style={{display:"flex",alignItems:"center",gap:8}}>
                  <div style={{flex:1}}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:2}}>
                      <span style={{fontFamily:sans,fontSize:12,fontWeight:600,color:"#171717"}}>{flow}</span>
                      <span style={{fontFamily:mono,fontSize:11,color:"#525252"}}>{count} <span style={{fontSize:9,color:"#a3a3a3"}}>{pct}%</span></span>
                    </div>
                    <div style={{height:4,background:"#f5f5f5",borderRadius:99,overflow:"hidden"}}>
                      <div style={{height:"100%",width:pct+"%",background:"#8b5cf6",borderRadius:99}}/>
                    </div>
                  </div>
                </div>;
              })}
            </div>:<div style={{fontFamily:sans,fontSize:12,color:"#a3a3a3"}}>no signup events tracked yet</div>}
          </div>
        </div>

        {/* SECTION 4: Engagement Breakdown — two panels */}
        <div className="admin-2col">
          {/* Left: Positions Ranked */}
          <div style={{background:"#fff",border:"1px solid #e5e5e5",borderRadius:12,padding:"16px 20px"}}>
            <div style={{fontFamily:mono,fontSize:9,letterSpacing:2,color:"#a3a3a3",textTransform:"uppercase",marginBottom:10}}>positions ranked <span style={{color:"#d4d4d4"}}>of {stats.totalUsers} users</span></div>
            <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
              {POSITION_GROUPS.map(pos=>{
                const full=stats.posStats[pos]||0;
                const partial=stats.partialCount[pos]||0;
                const c=POS_COLORS[pos];
                return<div key={pos} style={{textAlign:"center",padding:"6px 10px",background:`${c}08`,borderRadius:6,minWidth:55}}>
                  <div style={{fontFamily:font,fontSize:13,fontWeight:900,color:c}}>{pos}</div>
                  <div style={{fontFamily:mono,fontSize:13,fontWeight:900,color:"#171717"}}>{full}{partial>0&&<span style={{fontSize:10,color:"#ca8a04"}}>+{partial}</span>}</div>
                </div>;
              })}
            </div>
          </div>
          {/* Right: Feature Usage */}
          <div style={{background:"#fff",border:"1px solid #e5e5e5",borderRadius:12,padding:"16px 20px"}}>
            <div style={{fontFamily:mono,fontSize:9,letterSpacing:2,color:"#a3a3a3",textTransform:"uppercase",marginBottom:10}}>feature usage</div>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {[
                {label:"Rankings",started:stats.rankingsStarted,completed:stats.rankingsCompleted,color:"#3b82f6"},
                {label:"Mocks",started:stats.mocksStarted,completed:stats.mocksCompleted,color:"#f59e0b"},
              ].map(f=>{
                const rate=f.started>0?Math.round(f.completed/f.started*100):0;
                return<div key={f.label} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"6px 10px",background:"#f9f9f7",borderRadius:6}}>
                  <span style={{fontFamily:sans,fontSize:12,fontWeight:600,color:"#171717"}}>{f.label}</span>
                  <span style={{fontFamily:mono,fontSize:11,color:f.color}}>{f.completed} <span style={{color:"#a3a3a3",fontSize:10}}>completed</span> / {f.started} <span style={{color:"#a3a3a3",fontSize:10}}>started</span> <span style={{fontWeight:700,color:f.color}}>{rate}%</span></span>
                </div>;
              })}
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"6px 10px",background:"#f9f9f7",borderRadius:6}}>
                <span style={{fontFamily:sans,fontSize:12,fontWeight:600,color:"#171717"}}>Completed Mocks</span>
                <span style={{fontFamily:mono,fontSize:11,color:"#f59e0b"}}>{stats.singleTeamMocks} <span style={{color:"#a3a3a3",fontSize:10}}>1-team</span> · {stats.multiTeamMocks-stats.allTeamMocks} <span style={{color:"#a3a3a3",fontSize:10}}>multi</span> · {stats.allTeamMocks} <span style={{color:"#a3a3a3",fontSize:10}}>32-team</span></span>
              </div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"6px 10px",background:"#f9f9f7",borderRadius:6}}>
                <span style={{fontFamily:sans,fontSize:12,fontWeight:600,color:"#171717"}}>Shares</span>
                <span style={{fontFamily:mono,fontSize:11,color:"#22c55e"}}>{stats.totalShares} <span style={{color:"#a3a3a3",fontSize:10}}>total · {stats.shareUsers} users</span></span>
              </div>
              {stats.shareByType&&Object.keys(stats.shareByType).length>0&&<div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"6px 10px",background:"#f9f9f7",borderRadius:6}}>
                <span style={{fontFamily:sans,fontSize:12,fontWeight:600,color:"#171717"}}>Share Breakdown</span>
                <span style={{fontFamily:mono,fontSize:11,color:"#22c55e"}}>{Object.entries(stats.shareByType).sort((a,b)=>b[1]-a[1]).map(([t,c])=><span key={t}>{c} <span style={{color:"#a3a3a3",fontSize:10}}>{t.replace(/_/g,' ')}</span></span>).reduce((a,b)=>[a,' · ',b])}</span>
              </div>}
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"6px 10px",background:"#f9f9f7",borderRadius:6}}>
                <span style={{fontFamily:sans,fontSize:12,fontWeight:600,color:"#171717"}}>Notes Written</span>
                <span style={{fontFamily:mono,fontSize:11,color:"#8b5cf6"}}>{stats.noteUsers} <span style={{color:"#a3a3a3",fontSize:10}}>users</span></span>
              </div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"6px 10px",background:"#f9f9f7",borderRadius:6}}>
                <span style={{fontFamily:sans,fontSize:12,fontWeight:600,color:"#171717"}}>Community Boards</span>
                <span style={{fontFamily:mono,fontSize:11,color:"#171717"}}>{stats.communityUsers} <span style={{color:"#a3a3a3",fontSize:10}}>published</span></span>
              </div>
            </div>
          </div>
        </div>

        {/* All Events — compact pills */}
        <div style={{background:"#fff",border:"1px solid #e5e5e5",borderRadius:12,padding:"16px 20px",marginBottom:24}}>
          <div style={{fontFamily:mono,fontSize:9,letterSpacing:2,color:"#a3a3a3",textTransform:"uppercase",marginBottom:10}}>all events by type</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
            {Object.entries(displayEventCounts.counts||{}).sort((a,b)=>b[1]-a[1]).map(([evt,count])=>{
              const uu=displayEventCounts.unique?.[evt]?.size||0;
              return<div key={evt} style={{padding:"5px 10px",background:"#f9f9f7",borderRadius:6,textAlign:"center",minWidth:70}}>
                <div style={{fontFamily:mono,fontSize:14,fontWeight:900,color:"#171717"}}>{count}<span style={{fontSize:9,fontWeight:400,color:"#a3a3a3",marginLeft:3}}>{uu}u</span></div>
                <div style={{fontFamily:mono,fontSize:7,color:"#a3a3a3"}}>{evt.replace(/_/g,' ')}</div>
              </div>;
            })}
          </div>
        </div>

        {/* SECTION 5: Users Table */}
        <div style={{background:"#fff",border:"1px solid #e5e5e5",borderRadius:12,overflow:"hidden",marginBottom:24}}>
          <div style={{padding:"14px 16px",borderBottom:"1px solid #f0f0f0",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <span style={{fontFamily:font,fontSize:18,fontWeight:900,color:"#171717"}}>users ({users.filter(u=>!u.isAnon).length})</span>
            <span style={{fontFamily:mono,fontSize:9,color:"#a3a3a3"}}>{users.filter(u=>tagUser(u).label==="power user").length} power · {users.filter(u=>tagUser(u).label==="drafter").length} drafters · {users.filter(u=>tagUser(u).label==="ranker").length} rankers</span>
          </div>
          <div className="admin-table-head" style={{padding:"8px 16px",background:"#f9f9f7",borderBottom:"1px solid #e5e5e5"}}>
            {["Email","Status","Ranked","Activity"].map(h=><span key={h} style={{fontFamily:mono,fontSize:8,letterSpacing:1,color:"#a3a3a3",textTransform:"uppercase"}}>{h}</span>)}
            <span className="admin-table-hide" style={{fontFamily:mono,fontSize:8,letterSpacing:1,color:"#a3a3a3",textTransform:"uppercase"}}>Last Active</span>
          </div>
          <div style={{maxHeight:500,overflowY:"auto"}}>
            {users.map((u,i)=>{
              const tag=tagUser(u);
              const isExp=expandedUser===u.userId;
              return<div key={u.userId}>
                <div className="admin-table-row" onClick={()=>setExpandedUser(isExp?null:u.userId)} style={{padding:"7px 16px",borderBottom:isExp?"none":i<users.length-1?"1px solid #f8f8f6":"none",alignItems:"center",cursor:"pointer"}}>
                  <span style={{fontFamily:mono,fontSize:10,color:"#525252",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{u.email||u.userId.slice(0,12)+'…'}</span>
                  <span style={{fontFamily:mono,fontSize:8,fontWeight:700,color:tag.color,background:tag.bg,padding:"2px 6px",borderRadius:4,textAlign:"center"}}>{tag.label}</span>
                  <span style={{fontFamily:mono,fontSize:11,fontWeight:700,color:u.rankedPositions>0?"#22c55e":"#e5e5e5",textAlign:"center"}}>{u.rankedPositions}/{POSITION_GROUPS.length}</span>
                  <span style={{fontFamily:mono,fontSize:11,fontWeight:700,color:u.eventCount>0?"#3b82f6":"#e5e5e5",textAlign:"center"}}>{u.eventCount}</span>
                  <span className="admin-table-hide" style={{fontFamily:mono,fontSize:9,color:"#a3a3a3"}}>{u.updatedAt?new Date(u.updatedAt).toLocaleDateString('en-US',{month:'short',day:'numeric'})+" "+new Date(u.updatedAt).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"}):""}</span>
                </div>
                {isExp&&(()=>{
                  const ue={};(allEventsRaw||[]).filter(e=>u.isAnon?(e.user_id===null||e.user_id===undefined||e.metadata?.guest===true):e.user_id===u.userId).forEach(e=>{ue[e.event]=(ue[e.event]||0)+1;});
                  const evtColor=ev=>ev==='signup'||ev==='login'?"#22c55e":ev.includes('mock_draft')?"#f59e0b":ev.includes('ranking')?"#3b82f6":ev.includes('share')?"#22c55e":ev==='session_return'?"#a3a3a3":"#8b5cf6";
                  return<div style={{padding:"8px 16px 12px",background:"#f9f9f7",borderBottom:i<users.length-1?"1px solid #e5e5e5":"none"}}>
                  <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:8}}>
                    {Object.entries(ue).sort((a,b)=>b[1]-a[1]).map(([evt,count])=><div key={evt} style={{padding:"4px 8px",background:"#fff",borderRadius:6,textAlign:"center",minWidth:50,border:"1px solid #e5e5e5"}}>
                      <div style={{fontFamily:mono,fontSize:13,fontWeight:900,color:evtColor(evt)}}>{count}</div>
                      <div style={{fontFamily:mono,fontSize:7,color:"#a3a3a3"}}>{evt.replace(/_/g,' ')}</div>
                    </div>)}
                    {u.noteCount>0&&<div style={{padding:"4px 8px",background:"#fff",borderRadius:6,textAlign:"center",minWidth:50,border:"1px solid #e5e5e5"}}>
                      <div style={{fontFamily:mono,fontSize:13,fontWeight:900,color:"#8b5cf6"}}>{u.noteCount}</div>
                      <div style={{fontFamily:mono,fontSize:7,color:"#a3a3a3"}}>notes</div>
                    </div>}
                  </div>
                  <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:6}}>
                    {u.rankedGroups.length>0&&<div style={{display:"flex",alignItems:"center",gap:4,flexWrap:"wrap"}}>
                      <span style={{fontFamily:mono,fontSize:8,color:"#a3a3a3"}}>ranked:</span>
                      {u.rankedGroups.map(pos=><span key={pos} style={{fontFamily:mono,fontSize:9,fontWeight:700,color:POS_COLORS[pos]||"#525252",background:`${POS_COLORS[pos]||"#525252"}0d`,padding:"1px 5px",borderRadius:3}}>{pos}</span>)}
                    </div>}
                    {u.partialGroups.length>0&&<div style={{display:"flex",alignItems:"center",gap:4,flexWrap:"wrap"}}>
                      <span style={{fontFamily:mono,fontSize:8,color:"#a3a3a3"}}>in progress:</span>
                      {u.partialGroups.map(pos=><span key={pos} style={{fontFamily:mono,fontSize:9,color:"#ca8a04",background:"#fefce8",padding:"1px 5px",borderRadius:3}}>{pos}</span>)}
                    </div>}
                  </div>
                  <div style={{display:"flex",gap:12,fontFamily:mono,fontSize:9,color:"#a3a3a3"}}>
                    <span>{u.isAnon?"first seen":"signed up"} {u.createdAt?new Date(u.createdAt).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}):""}</span>
                    <span>last active {u.updatedAt?new Date(u.updatedAt).toLocaleDateString('en-US',{month:'short',day:'numeric'})+" "+new Date(u.updatedAt).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"}):""}</span>
                  </div>
                </div>})()}
              </div>;
            })}
          </div>
        </div>

        {/* SECTION 6: Recent Events — collapsible */}
        <div style={{background:"#fff",border:"1px solid #e5e5e5",borderRadius:12,overflow:"hidden"}}>
          <div style={{padding:"14px 16px",borderBottom:showEventLog?"1px solid #f0f0f0":"none",display:"flex",justifyContent:"space-between",alignItems:"center",cursor:"pointer"}} onClick={()=>setShowEventLog(v=>!v)}>
            <span style={{fontFamily:font,fontSize:18,fontWeight:900,color:"#171717"}}>event log</span>
            <button style={{fontFamily:mono,fontSize:10,color:"#a3a3a3",background:"#f5f5f5",border:"1px solid #e5e5e5",borderRadius:6,padding:"4px 10px",cursor:"pointer"}}>{showEventLog?"hide":"show"}</button>
          </div>
          {showEventLog&&<div style={{maxHeight:350,overflowY:"auto"}}>
            {displayEvents.map((e,i)=>{
              const evtColor=e.event==='signup'?"#22c55e":e.event.includes('mock_draft')?"#f59e0b":e.event==='ranking_completed'?"#3b82f6":e.event==='ranking_started'?"#8b5cf6":e.event==='share_results'?"#22c55e":"#a3a3a3";
              const eu=users.find(u=>u.userId===e.user_id);
              return<div key={e.id} className="admin-event-row" style={{padding:"5px 16px",borderBottom:i<displayEvents.length-1?"1px solid #fafaf8":"none",fontSize:10,fontFamily:mono,alignItems:"center"}}>
                <span style={{color:evtColor,fontWeight:700}}>{e.event.replace(/_/g,' ')}</span>
                <span style={{color:"#525252",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{eu?.email||e.session_id||e.user_id?.slice(0,12)+'…'}</span>
                <span className="admin-event-meta" style={{color:"#a3a3a3",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{e.metadata&&Object.keys(e.metadata).length>0?JSON.stringify(e.metadata):""}</span>
                <span style={{color:"#d4d4d4"}}>{new Date(e.created_at).toLocaleDateString('en-US',{month:'short',day:'numeric'})} {new Date(e.created_at).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}</span>
              </div>;
            })}
          </div>}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Guide Page: /guide — how to use Big Board Lab
// ============================================================
function GuidePage({onBack}){
  useEffect(()=>{trackEvent(null,'guide_viewed');},[]);
  useEffect(()=>{
    const guideTitle='How to Use Big Board Lab | 2026 NFL Draft Board Builder Guide';
    const guideDesc='Learn how to rank prospects, grade traits, run AI mock drafts, compare players, and build your 2026 NFL big board with Big Board Lab.';
    const guideUrl='https://bigboardlab.com/guide';
    // Save originals
    const origTitle=document.title;
    const saveMeta=(sel)=>{const el=document.querySelector(sel);return el?el.getAttribute('content'):null;};
    const origDesc=saveMeta('meta[name="description"]');
    const origCanonical=document.querySelector('link[rel="canonical"]')?.getAttribute('href');
    const origOgTitle=saveMeta('meta[property="og:title"]');
    const origOgDesc=saveMeta('meta[property="og:description"]');
    const origOgUrl=saveMeta('meta[property="og:url"]');
    const origTwTitle=saveMeta('meta[name="twitter:title"]');
    const origTwDesc=saveMeta('meta[name="twitter:description"]');
    // Helper to set or create a meta tag
    const setMeta=(sel,attr,val)=>{let el=document.querySelector(sel);if(!el){el=document.createElement('meta');const[a,v]=attr.split('=');el.setAttribute(a,v);document.head.appendChild(el);}el.setAttribute('content',val);return el;};
    // Set guide meta
    document.title=guideTitle;
    setMeta('meta[name="description"]','name=description',guideDesc);
    let canonical=document.querySelector('link[rel="canonical"]');
    if(!canonical){canonical=document.createElement('link');canonical.rel='canonical';document.head.appendChild(canonical);}
    canonical.setAttribute('href',guideUrl);
    // OG tags
    setMeta('meta[property="og:title"]','property=og:title',guideTitle);
    setMeta('meta[property="og:description"]','property=og:description',guideDesc);
    setMeta('meta[property="og:url"]','property=og:url',guideUrl);
    // Twitter tags
    setMeta('meta[name="twitter:title"]','name=twitter:title',guideTitle);
    setMeta('meta[name="twitter:description"]','name=twitter:description',guideDesc);
    // JSON-LD HowTo
    const ld=document.createElement('script');ld.type='application/ld+json';
    ld.textContent=JSON.stringify({"@context":"https://schema.org","@type":"HowTo","name":"How to Use Big Board Lab","description":"Build your own 2026 NFL draft big board with pair rankings, trait grading, AI mock drafts, and more.","step":[
      {"@type":"HowToStep","name":"Rank Prospects Head-to-Head","text":"Compare two players side by side and pick a winner to build Elo rankings."},
      {"@type":"HowToStep","name":"Grade Every Trait","text":"Slide trait scores to evaluate arm strength, speed, coverage, and more."},
      {"@type":"HowToStep","name":"Build Your Big Board","text":"View your ranked board filtered by position with grades and radar charts."},
      {"@type":"HowToStep","name":"Compare Players Side by Side","text":"Pin up to 4 players and compare radar charts and trait values."},
      {"@type":"HowToStep","name":"Mock Draft Against 32 AI GMs","text":"Simulate a full 7-round NFL draft with realistic team tendencies and trade logic."},
      {"@type":"HowToStep","name":"Track Your Guys","text":"See which prospects you draft most often and your scouting fingerprint."},
      {"@type":"HowToStep","name":"Share Your Board","text":"Generate a shareable image of your big board or mock draft results."},
      {"@type":"HowToStep","name":"Community Consensus","text":"See aggregate rankings across all Big Board Lab users."},
      {"@type":"HowToStep","name":"Player Profiles","text":"Dive deep into any prospect with stats, combine data, and trait radar."},
      {"@type":"HowToStep","name":"Drag to Reorder","text":"Fine-tune your board by dragging players into your preferred order."}
    ]});
    document.head.appendChild(ld);
    // Cleanup: restore originals
    return()=>{
      document.title=origTitle;
      if(origDesc)setMeta('meta[name="description"]','name=description',origDesc);
      if(origCanonical)canonical.setAttribute('href',origCanonical);else canonical.remove();
      if(origOgTitle)setMeta('meta[property="og:title"]','property=og:title',origOgTitle);
      if(origOgDesc)setMeta('meta[property="og:description"]','property=og:description',origOgDesc);
      if(origOgUrl)setMeta('meta[property="og:url"]','property=og:url',origOgUrl);
      if(origTwTitle)setMeta('meta[name="twitter:title"]','name=twitter:title',origTwTitle);
      if(origTwDesc)setMeta('meta[name="twitter:description"]','name=twitter:description',origTwDesc);
      ld.remove();
    };
  },[]);

  const scrollTo=(id)=>{const el=document.getElementById(id);if(el)el.scrollIntoView({behavior:'smooth',block:'start'});};

  // Demo data
  const demoProspects=[
    PROSPECTS.find(p=>p.name==="Rueben Bain Jr."),
    PROSPECTS.find(p=>p.name==="David Bailey"),
    PROSPECTS.find(p=>p.name==="Caleb Downs"),
    PROSPECTS.find(p=>p.name==="Garrett Nussmeier"),
    PROSPECTS.find(p=>p.name==="Francis Mauigoa"),
  ].filter(Boolean);
  const compProspects=[
    PROSPECTS.find(p=>p.name==="Garrett Nussmeier"),
    PROSPECTS.find(p=>p.name==="Cade Klubnik"),
    PROSPECTS.find(p=>p.name==="Drew Allar"),
  ].filter(Boolean);
  const compColors=["#2563eb","#dc2626","#16a34a"];
  const boardProspects=[
    PROSPECTS.find(p=>p.name==="Rueben Bain Jr."),
    PROSPECTS.find(p=>p.name==="Caleb Downs"),
    PROSPECTS.find(p=>p.name==="Francis Mauigoa"),
    PROSPECTS.find(p=>p.name==="Garrett Nussmeier"),
    PROSPECTS.find(p=>p.name==="Jordyn Tyson"),
  ].filter(Boolean);
  const consensusDemo=[
    {name:"Rueben Bain Jr.",pos:"EDGE",rank:1,prev:3},
    {name:"Caleb Downs",pos:"S",rank:2,prev:2},
    {name:"Francis Mauigoa",pos:"OT",rank:3,prev:5},
    {name:"Garrett Nussmeier",pos:"QB",rank:4,prev:1},
    {name:"David Bailey",pos:"DL",rank:5,prev:7},
  ];
  const mockTeams=["Raiders","Jets","Cardinals","Titans","Giants","Browns","Commanders","Saints"];

  const sections=[
    {id:"rank",num:"01",title:"Rank Prospects Head-to-Head"},
    {id:"grade",num:"02",title:"Grade Every Trait"},
    {id:"board",num:"03",title:"Build Your Big Board"},
    {id:"compare",num:"04",title:"Compare Players Side by Side"},
    {id:"mock",num:"05",title:"Mock Draft Against 32 AI GMs"},
    {id:"traits",num:"06",title:"Filter by Standout Traits"},
    {id:"track",num:"07",title:"Track Your Guys"},
    {id:"share",num:"08",title:"Share Your Board"},
    {id:"depth",num:"09",title:"Live Depth Chart Updates"},
    {id:"profiles",num:"10",title:"Player Profiles"},
    {id:"reorder",num:"11",title:"Drag to Reorder"},
  ];

  const card={background:"#fff",border:"1px solid #e5e5e5",borderRadius:16,padding:"28px 24px",maxWidth:720,margin:"0 auto 24px"};
  const sectionNum=(n)=>({fontFamily:mono,fontSize:11,fontWeight:700,letterSpacing:3,background:"linear-gradient(135deg,#ec4899,#7c3aed)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",textTransform:"uppercase"});
  const h2s={fontFamily:font,fontSize:28,fontWeight:900,color:"#171717",margin:"8px 0 12px",lineHeight:1.15};
  const desc={fontFamily:sans,fontSize:14,color:"#525252",lineHeight:1.65,margin:"0 0 16px"};
  const tip={fontFamily:sans,fontSize:12,color:"#7c3aed",background:"#f5f3ff",border:"1px solid #ede9fe",borderRadius:10,padding:"10px 14px",margin:"12px 0 0",textWrap:"pretty"};

  return(<div style={{minHeight:"100vh",background:"#faf9f6",fontFamily:font}}>
    <style>{`
      .guide-toc-pill:hover{background:#f5f3ff!important;border-color:#c4b5fd!important;color:#7c3aed!important;}
      .guide-card:hover{box-shadow:0 4px 24px rgba(0,0,0,0.06);}
      @media(max-width:600px){
        .guide-pair-row{flex-direction:column!important;gap:12px!important;}
        .guide-compare-radars{flex-direction:column!important;align-items:center!important;}
        .guide-team-grid{grid-template-columns:repeat(4,1fr)!important;}
        .guide-hero-h1{font-size:36px!important;}
      }
    `}</style>

    {/* Nav */}
    <div style={{position:"fixed",top:0,left:0,right:0,zIndex:100,background:"rgba(250,249,246,0.92)",backdropFilter:"blur(12px)",borderBottom:"1px solid #e5e5e5"}}>
      <div style={{maxWidth:720,margin:"0 auto",padding:"10px 24px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <img src="/logo.png" alt="Big Board Lab" style={{width:28,height:"auto"}}/>
          <span style={{fontFamily:mono,fontSize:10,letterSpacing:2,color:"#a3a3a3",textTransform:"uppercase"}}>guide</span>
        </div>
        <button onClick={onBack} style={{fontFamily:sans,fontSize:12,fontWeight:600,color:"#7c3aed",background:"none",border:"1px solid #ede9fe",borderRadius:99,padding:"6px 16px",cursor:"pointer"}}>← back to app</button>
      </div>
    </div>

    {/* Hero */}
    <div style={{textAlign:"center",padding:"80px 24px 32px",maxWidth:720,margin:"0 auto"}}>
      <p style={{fontFamily:mono,fontSize:10,letterSpacing:4,color:"#a3a3a3",textTransform:"uppercase",margin:"0 0 8px"}}>how to use</p>
      <h1 className="guide-hero-h1" style={{fontFamily:font,fontSize:"clamp(32px,7vw,52px)",fontWeight:900,color:"#171717",margin:"0 0 12px",lineHeight:1,letterSpacing:-2}}>big board lab</h1>
      <p style={{fontFamily:sans,fontSize:16,color:"#737373",lineHeight:1.6,maxWidth:520,margin:"0 auto 24px"}}>Everything you need to rank, grade, and mock draft the 2026 NFL class — in one place.</p>
      <div style={{width:120,height:3,background:"linear-gradient(90deg,#ec4899,#7c3aed)",borderRadius:99,margin:"0 auto"}}/>
    </div>

    {/* TOC */}
    <div style={{maxWidth:720,margin:"0 auto 32px",padding:"0 24px"}}>
      <div style={{display:"flex",flexWrap:"wrap",gap:8,justifyContent:"center"}}>
        {sections.map(s=>(
          <button key={s.id} className="guide-toc-pill" onClick={()=>scrollTo(`guide-${s.id}`)} style={{fontFamily:sans,fontSize:11,fontWeight:600,color:"#525252",background:"#fff",border:"1px solid #e5e5e5",borderRadius:99,padding:"6px 14px",cursor:"pointer",transition:"all 0.15s",whiteSpace:"nowrap"}}>
            <span style={{fontFamily:mono,fontSize:9,color:"#a3a3a3",marginRight:6}}>{s.num}</span>{s.title}
          </button>
        ))}
      </div>
    </div>

    {/* === SECTIONS === */}
    <div style={{maxWidth:720,margin:"0 auto",padding:"0 24px"}}>

      {/* 01 — Rank Prospects Head-to-Head */}
      <div id="guide-rank" className="guide-card" style={{...card,scrollMarginTop:70,transition:"box-shadow 0.2s"}}>
        <div style={sectionNum("01")}>01</div>
        <div style={{width:"100%",height:1,background:"linear-gradient(90deg,#ec4899,#7c3aed,transparent)",margin:"4px 0 12px"}}/>
        <h2 style={h2s}>Rank Prospects Head-to-Head</h2>
        <p style={desc}>Pick a position, and we'll serve up two prospects at a time. Choose who you'd draft first — your picks feed an Elo algorithm that builds your rankings automatically.</p>
        <div className="guide-pair-row" style={{display:"flex",gap:20,justifyContent:"center",alignItems:"center",margin:"16px 0"}}>
          {(()=>{const cards=demoProspects.slice(0,2).map(p=>{const c=POS_COLORS[p.gpos||p.pos];return<div key={p.id} style={{flex:"0 0 auto",background:"#faf9f6",border:`2px solid ${c}22`,borderRadius:14,padding:"16px 20px",textAlign:"center",minWidth:140}}>
            <SchoolLogo school={p.school} size={40}/>
            <div style={{fontFamily:font,fontSize:16,fontWeight:800,color:"#171717",marginTop:8}}>{p.name}</div>
            <span style={{fontFamily:mono,fontSize:10,fontWeight:700,color:c,background:`${c}0d`,padding:"3px 10px",borderRadius:99,display:"inline-block",marginTop:6}}>{p.gpos||p.pos}</span>
          </div>;});return<>{cards[0]}<div style={{fontFamily:font,fontSize:20,fontWeight:900,color:"#d4d4d4",flexShrink:0}}>vs</div>{cards[1]}</>;})()}
        </div>
        <div style={{display:"flex",gap:8,justifyContent:"center",flexWrap:"wrap"}}>
          {[{label:"coin flip",k:16},{label:"leaning",k:24},{label:"confident",k:32},{label:"lock",k:40}].map(({label,k},i)=>(
            <div key={label} style={{fontFamily:sans,fontSize:10,fontWeight:600,background:k>=32?"#171717":"#fff",color:k>=32?"#faf9f6":"#525252",border:`1px solid ${k>=32?"#171717":"#e5e5e5"}`,borderRadius:99,padding:"5px 12px"}}>{label}</div>
          ))}
        </div>
        <div style={tip}>💡 <strong>Focus mode:</strong> tap the 📌 icon next to any player in the live rankings sidebar to lock matchups on them. Every comparison will include that player until you unlock, so you can place them precisely on your board.</div>
      </div>

      {/* 02 — Grade Every Trait */}
      <div id="guide-grade" className="guide-card" style={{...card,scrollMarginTop:70,transition:"box-shadow 0.2s"}}>
        <div style={sectionNum("02")}>02</div>
        <div style={{width:"100%",height:1,background:"linear-gradient(90deg,#ec4899,#7c3aed,transparent)",margin:"4px 0 12px"}}/>
        <h2 style={h2s}>Grade Every Trait</h2>
        <p style={desc}>Slide trait scores from 0–100 for position-specific attributes. Watch radar charts and overall grades update in real time.</p>
        {(()=>{const p=demoProspects[3];if(!p)return null;const pos=p.gpos||p.pos;const posTraits=POSITION_TRAITS[pos]||[];const c=POS_COLORS[pos];
          const demoVals=[82,75,68,72,78,65];
          return<div style={{margin:"16px 0"}}>
            <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:16}}>
              {posTraits.slice(0,4).map((t,i)=>{const v=demoVals[i]||60;return<div key={t} style={{display:"flex",alignItems:"center",gap:10}}>
                <span style={{fontFamily:sans,fontSize:11,fontWeight:600,color:"#525252",width:100,textAlign:"right",flexShrink:0}}>{TRAIT_SHORT[t]||t}</span>
                <div style={{flex:1,height:6,background:"#f0f0f0",borderRadius:99,overflow:"hidden"}}><div style={{width:`${v}%`,height:"100%",background:`linear-gradient(90deg,${c},${c}aa)`,borderRadius:99}}/></div>
                <span style={{fontFamily:mono,fontSize:11,fontWeight:700,color:c,width:28,textAlign:"right"}}>{v}</span>
              </div>;})}
            </div>
            <div style={{display:"flex",justifyContent:"center"}}>
              <RadarChart traits={posTraits} values={demoVals} color={c} size={160}/>
            </div>
            <div style={{display:"flex",gap:8,justifyContent:"center",marginTop:12}}>
              {["Capped","Normal","High","Elite"].map((label,i)=>{const colors=["#a3a3a3","#525252","#2563eb","#7c3aed"];return<span key={label} style={{fontFamily:sans,fontSize:10,fontWeight:600,color:colors[i],background:`${colors[i]}0d`,border:`1px solid ${colors[i]}1a`,borderRadius:99,padding:"4px 12px"}}>{label}</span>;})}
            </div>
          </div>;
        })()}
        <div style={tip}>💡 <strong>Ceiling grades</strong> factor in how teachable each trait is — raw athleticism matters more than technique for upside.</div>
      </div>

      {/* 03 — Build Your Big Board */}
      <div id="guide-board" className="guide-card" style={{...card,scrollMarginTop:70,transition:"box-shadow 0.2s"}}>
        <div style={sectionNum("03")}>03</div>
        <div style={{width:"100%",height:1,background:"linear-gradient(90deg,#ec4899,#7c3aed,transparent)",margin:"4px 0 12px"}}/>
        <h2 style={h2s}>Build Your Big Board</h2>
        <p style={desc}>As you rank and grade, your big board assembles itself. Filter by position, toggle between your board and consensus, and see grades at a glance.</p>
        <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:16,justifyContent:"center"}}>
          {POSITION_GROUPS.map(g=><span key={g} style={{fontFamily:mono,fontSize:9,fontWeight:700,color:POS_COLORS[g],background:`${POS_COLORS[g]}0d`,border:`1px solid ${POS_COLORS[g]}1a`,borderRadius:99,padding:"4px 10px"}}>{g}</span>)}
        </div>
        <div style={{border:"1px solid #e5e5e5",borderRadius:10,overflow:"hidden"}}>
          {boardProspects.map((p,i)=>{const c=POS_COLORS[p.gpos||p.pos];const posTraits=POSITION_TRAITS[p.gpos||p.pos]||[];const vals=posTraits.map(t=>tv({},p.id,t,p.name,p.school));return<div key={p.id} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 12px",borderBottom:i<boardProspects.length-1?"1px solid #f5f5f5":"none",background:i%2===0?"#fff":"#faf9f6"}}>
            <span style={{fontFamily:mono,fontSize:11,fontWeight:700,color:"#a3a3a3",width:24,textAlign:"right"}}>{i+1}</span>
            <span style={{fontFamily:mono,fontSize:9,fontWeight:700,color:c,background:`${c}0d`,padding:"2px 8px",borderRadius:99}}>{p.gpos||p.pos}</span>
            <SchoolLogo school={p.school} size={20}/>
            <span style={{fontFamily:sans,fontSize:13,fontWeight:600,color:"#171717",flex:1}}>{p.name}</span>
            <MiniRadar values={vals} color={c} size={24}/>
          </div>;})}
        </div>
        <div style={{display:"flex",gap:0,marginTop:12,justifyContent:"center"}}>
          {["my board","consensus"].map((label,i)=><div key={label} style={{fontFamily:sans,fontSize:11,fontWeight:600,padding:"6px 16px",background:i===0?"#171717":"#fff",color:i===0?"#fff":"#a3a3a3",border:"1px solid #e5e5e5",borderRadius:i===0?"99px 0 0 99px":"0 99px 99px 0",cursor:"default"}}>{label}</div>)}
        </div>
      </div>

      {/* 04 — Compare Players Side by Side */}
      <div id="guide-compare" className="guide-card" style={{...card,scrollMarginTop:70,transition:"box-shadow 0.2s"}}>
        <div style={sectionNum("04")}>04</div>
        <div style={{width:"100%",height:1,background:"linear-gradient(90deg,#ec4899,#7c3aed,transparent)",margin:"4px 0 12px"}}/>
        <h2 style={h2s}>Compare Players Side by Side</h2>
        <p style={desc}>Pin up to 4 players from the same position and compare radar charts, individual trait scores, and overall grades in one view.</p>
        {(()=>{const pos=compProspects[0]?.gpos||compProspects[0]?.pos||"QB";const posTraits=POSITION_TRAITS[pos]||[];
          return<div>
            <div className="guide-compare-radars" style={{display:"flex",gap:16,justifyContent:"center",margin:"16px 0"}}>
              {compProspects.map((p,ci)=>{const vals=posTraits.map(t=>tv({},p.id,t,p.name,p.school));return<div key={p.id} style={{textAlign:"center"}}>
                <RadarChart traits={posTraits} values={vals} color={compColors[ci]} size={120}/>
                <div style={{fontFamily:mono,fontSize:10,fontWeight:600,color:compColors[ci],marginTop:-2}}>{shortName(p.name)}</div>
              </div>;})}
            </div>
            <div style={{border:"1px solid #e5e5e5",borderRadius:10,overflow:"hidden"}}>
              {posTraits.slice(0,4).map((t,ti)=>{const vals=compProspects.map(p=>tv({},p.id,t,p.name,p.school));const best=Math.max(...vals);const worst=Math.min(...vals);
                return<div key={t} style={{display:"flex",alignItems:"center",padding:"6px 12px",borderBottom:ti<3?"1px solid #f5f5f5":"none"}}>
                  <span style={{fontFamily:sans,fontSize:11,color:"#737373",width:100,flexShrink:0}}>{TRAIT_SHORT[t]||t}</span>
                  <div style={{flex:1,display:"flex",gap:12,justifyContent:"center"}}>
                    {vals.map((v,vi)=><span key={vi} style={{fontFamily:font,fontSize:13,fontWeight:700,color:v===best&&best!==worst?compColors[vi]:v===worst&&best!==worst?"#d4d4d4":"#525252",width:36,textAlign:"center"}}>{v}</span>)}
                  </div>
                </div>;
              })}
            </div>
          </div>;
        })()}
      </div>

      {/* 05 — Mock Draft Against 32 AI GMs */}
      <div id="guide-mock" className="guide-card" style={{...card,scrollMarginTop:70,transition:"box-shadow 0.2s"}}>
        <div style={sectionNum("05")}>05</div>
        <div style={{width:"100%",height:1,background:"linear-gradient(90deg,#ec4899,#7c3aed,transparent)",margin:"4px 0 12px"}}/>
        <h2 style={h2s}>Mock Draft Against 32 AI GMs</h2>
        <p style={desc}>Pick your team and draft against 31 AI-controlled GMs that follow real team tendencies, positional needs, and trade logic.</p>
        <div className="guide-team-grid" style={{display:"grid",gridTemplateColumns:"repeat(8,1fr)",gap:8,margin:"16px 0"}}>
          {mockTeams.map(t=><div key={t} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4,padding:6,background:"#faf9f6",borderRadius:8,border:"1px solid #f0f0f0"}}>
            <NFLTeamLogo team={t} size={24}/>
            <span style={{fontFamily:mono,fontSize:8,color:"#a3a3a3",fontWeight:600}}>{NFL_TEAM_ABR[t]}</span>
          </div>)}
        </div>
        <div style={{display:"flex",gap:12,alignItems:"center",justifyContent:"center",marginBottom:12}}>
          {[{label:"Rounds",val:"1–7"},{label:"Speed",val:"instant"}].map(({label,val})=><div key={label} style={{background:"#fff",border:"1px solid #e5e5e5",borderRadius:8,padding:"6px 14px",textAlign:"center"}}>
            <div style={{fontFamily:mono,fontSize:8,letterSpacing:1.5,color:"#a3a3a3",textTransform:"uppercase"}}>{label}</div>
            <div style={{fontFamily:sans,fontSize:13,fontWeight:700,color:"#171717"}}>{val}</div>
          </div>)}
        </div>
        <div style={{textAlign:"center"}}>
          <div style={{display:"inline-block",fontFamily:sans,fontSize:13,fontWeight:700,color:"#fff",background:"linear-gradient(135deg,#ec4899,#7c3aed)",borderRadius:99,padding:"10px 28px"}}>start draft</div>
        </div>
        <div style={tip}>💡 Each AI GM has unique tendencies — the Ravens take BPA, the Saints reach for need, and the Eagles take the guy everyone else let fall for some reason.</div>
      </div>

      {/* 06 — Filter by Standout Traits */}
      <div id="guide-traits" className="guide-card" style={{...card,scrollMarginTop:70,transition:"box-shadow 0.2s"}}>
        <div style={sectionNum("06")}>06</div>
        <div style={{width:"100%",height:1,background:"linear-gradient(90deg,#ec4899,#7c3aed,transparent)",margin:"4px 0 12px"}}/>
        <h2 style={h2s}>Filter by Standout Traits</h2>
        <p style={desc}>Most tools only let you filter by position. BBL lets you rank, mock draft, and browse by individual traits — want to only rank the best pass rushers? Tap the 🚀 Pass Rush pill and pair-rank just the elite rushers across EDGE and DL. Running a mock? Filter the draft board by Speed to see who your team should target.</p>
        <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:14,justifyContent:"center"}}>
          {["Pass Rush","Man Coverage","Route Running","Speed","Accuracy"].map(t=>{const emoji=TRAIT_EMOJI[t];return<span key={t} style={{fontFamily:sans,fontSize:11,fontWeight:600,color:"#7c3aed",background:"#f5f3ff",border:"1px solid #ede9fe",borderRadius:99,padding:"5px 12px",display:"inline-flex",alignItems:"center",gap:4}}>
            <span style={{fontSize:12}}>{emoji}</span>{t}
          </span>;})}
        </div>
        <div style={{border:"1px solid #e5e5e5",borderRadius:10,overflow:"hidden"}}>
          <div style={{fontFamily:mono,fontSize:9,letterSpacing:1.5,color:"#a3a3a3",textTransform:"uppercase",padding:"8px 12px",borderBottom:"1px solid #f0f0f0",display:"flex",alignItems:"center",gap:6}}>
            <span style={{fontSize:10}}>🚀</span> ranking by: pass rush
          </div>
          {[
            {name:"Rueben Bain Jr.",pos:"EDGE",val:92},
            {name:"T.J. Parker",pos:"EDGE",val:88},
            {name:"David Bailey",pos:"DL",val:85},
          ].map((p,i)=>{const c=POS_COLORS[p.pos];return<div key={p.name} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 12px",borderBottom:i<2?"1px solid #f5f5f5":"none"}}>
            <span style={{fontFamily:mono,fontSize:9,fontWeight:700,color:c,background:`${c}0d`,padding:"2px 8px",borderRadius:99}}>{p.pos}</span>
            <span style={{fontFamily:sans,fontSize:13,fontWeight:600,color:"#171717",flex:1}}>{p.name}</span>
            <span style={{fontFamily:mono,fontSize:11,fontWeight:700,color:"#7c3aed"}}>{p.val}</span>
          </div>;})}
        </div>
        <div style={tip}>💡 Trait filters work everywhere — on the big board, during pair ranking, and in mock drafts. Select "Speed" and you'll see the fastest WRs, RBs, and CBs all in one view.</div>
      </div>

      {/* 07 — Track Your Guys */}
      <div id="guide-track" className="guide-card" style={{...card,scrollMarginTop:70,transition:"box-shadow 0.2s"}}>
        <div style={sectionNum("07")}>07</div>
        <div style={{width:"100%",height:1,background:"linear-gradient(90deg,#ec4899,#7c3aed,transparent)",margin:"4px 0 12px"}}/>
        <h2 style={h2s}>Track Your Guys</h2>
        <p style={desc}>After running mock drafts, see which prospects you keep drafting. Your scouting fingerprint reveals the trait patterns you gravitate toward.</p>
        <div style={{display:"flex",flexDirection:"column",gap:8,margin:"16px 0"}}>
          {[{emoji:"🎯",text:"Prioritizes accuracy over arm strength"},{emoji:"🏎️",text:"Prefers speed at receiver"},{emoji:"🧱",text:"Values blocking tight ends"}].map((f,i)=>(
            <div key={i} style={{display:"flex",alignItems:"center",gap:10,background:"#f5f3ff",border:"1px solid #ede9fe",borderRadius:10,padding:"8px 14px"}}>
              <span style={{fontSize:16}}>{f.emoji}</span>
              <span style={{fontFamily:sans,fontSize:12,color:"#525252"}}>{f.text}</span>
            </div>
          ))}
        </div>
        <div style={{border:"1px solid #e5e5e5",borderRadius:10,overflow:"hidden"}}>
          <div style={{fontFamily:mono,fontSize:9,letterSpacing:1.5,color:"#a3a3a3",textTransform:"uppercase",padding:"8px 12px",borderBottom:"1px solid #f0f0f0"}}>your top guys</div>
          {demoProspects.slice(0,3).map((p,i)=>{const c=POS_COLORS[p.gpos||p.pos];return<div key={p.id} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 12px",borderBottom:i<2?"1px solid #f5f5f5":"none"}}>
            <SchoolLogo school={p.school} size={20}/>
            <span style={{fontFamily:sans,fontSize:12,fontWeight:600,color:"#171717",flex:1}}>{p.name}</span>
            <span style={{fontFamily:mono,fontSize:10,color:c,fontWeight:700}}>{p.gpos||p.pos}</span>
            <span style={{fontFamily:mono,fontSize:10,color:"#a3a3a3"}}>3× drafted</span>
          </div>;})}
        </div>
      </div>

      {/* 08 — Share Your Board */}
      <div id="guide-share" className="guide-card" style={{...card,scrollMarginTop:70,transition:"box-shadow 0.2s"}}>
        <div style={sectionNum("08")}>08</div>
        <div style={{width:"100%",height:1,background:"linear-gradient(90deg,#ec4899,#7c3aed,transparent)",margin:"4px 0 12px"}}/>
        <h2 style={h2s}>Share Your Results</h2>
        <p style={desc}>Share your big board, mock draft results, or your "My Guys" list — each generates a branded image card you can download and post to Twitter, Discord, or your group chat.</p>
        <div style={{display:"flex",gap:8,justifyContent:"center",flexWrap:"wrap",margin:"16px 0"}}>
          {["big board","mock results","my guys"].map((label,i)=>{const icons=["📋","🏈","👀"];return<div key={label} style={{display:"inline-flex",alignItems:"center",gap:6,fontFamily:sans,fontSize:11,fontWeight:600,color:i===0?"#7c3aed":"#525252",background:i===0?"#f5f3ff":"#fff",border:`1px solid ${i===0?"#ede9fe":"#e5e5e5"}`,borderRadius:99,padding:"6px 14px"}}>
            <span style={{fontSize:12}}>{icons[i]}</span>{label}
          </div>;})}
        </div>
        <div style={{display:"flex",gap:12,flexDirection:"column"}}>
          <div style={{background:"linear-gradient(135deg,#0f172a,#1e293b)",borderRadius:12,padding:"16px 20px",position:"relative",overflow:"hidden"}}>
            <div style={{position:"absolute",top:0,left:0,right:0,height:3,background:"linear-gradient(90deg,#ec4899,#7c3aed)"}}/>
            <div style={{fontFamily:font,fontSize:14,fontWeight:900,color:"#fff",marginBottom:6}}>my 2026 big board</div>
            {[1,2,3].map(i=><div key={i} style={{height:5,background:`linear-gradient(90deg,rgba(255,255,255,${0.15-i*0.03}),transparent)`,borderRadius:99,marginBottom:4,width:`${100-i*15}%`}}/>)}
            <div style={{fontFamily:mono,fontSize:7,color:"rgba(255,255,255,0.25)",marginTop:6}}>bigboardlab.com</div>
          </div>
          <div style={{background:"linear-gradient(135deg,#0f172a,#1e293b)",borderRadius:12,padding:"16px 20px",position:"relative",overflow:"hidden"}}>
            <div style={{position:"absolute",top:0,left:0,right:0,height:3,background:"linear-gradient(90deg,#22c55e,#3b82f6)"}}/>
            <div style={{fontFamily:font,fontSize:14,fontWeight:900,color:"#fff",marginBottom:6}}>mock draft results</div>
            <div style={{display:"flex",gap:8}}>
              {["LV","NYJ","ARI"].map((t,i)=><div key={t} style={{display:"flex",alignItems:"center",gap:4}}>
                <span style={{fontFamily:mono,fontSize:8,color:"#a3a3a3"}}>{i+1}.</span>
                <span style={{fontFamily:mono,fontSize:9,color:"#fff",fontWeight:600}}>{t}</span>
              </div>)}
              <span style={{fontFamily:mono,fontSize:8,color:"#525252"}}>…</span>
            </div>
            <div style={{fontFamily:mono,fontSize:7,color:"rgba(255,255,255,0.25)",marginTop:8}}>bigboardlab.com</div>
          </div>
        </div>
      </div>

      {/* 09 — Live Depth Chart Updates */}
      <div id="guide-depth" className="guide-card" style={{...card,scrollMarginTop:70,transition:"box-shadow 0.2s"}}>
        <div style={sectionNum("09")}>09</div>
        <div style={{width:"100%",height:1,background:"linear-gradient(90deg,#ec4899,#7c3aed,transparent)",margin:"4px 0 12px"}}/>
        <h2 style={h2s}>Live Depth Chart Updates</h2>
        <p style={desc}>Every pick in the mock draft lands on the team's actual roster in real time. Watch starters get displaced, needs get filled, and see exactly where each rookie slots into the depth chart as the draft unfolds.</p>
        <div style={{border:"1px solid #e5e5e5",borderRadius:10,overflow:"hidden"}}>
          <div style={{fontFamily:mono,fontSize:9,letterSpacing:1.5,color:"#a3a3a3",textTransform:"uppercase",padding:"8px 12px",borderBottom:"1px solid #f0f0f0",display:"flex",alignItems:"center",gap:6}}>
            <NFLTeamLogo team="Raiders" size={16}/> raiders depth chart
          </div>
          {[
            {slot:"QB1",name:"Fernando Mendoza",draft:true,displaced:"Aidan O'Connell"},
            {slot:"EDGE1",name:"Khalil Mack",draft:false},
            {slot:"WR1",name:"Jakobi Meyers",draft:false},
            {slot:"CB2",name:"Avieon Terrell",draft:true,displaced:"Brandon Facyson"},
          ].map((row,i)=><div key={row.slot} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 12px",borderBottom:i<3?"1px solid #f5f5f5":"none",background:row.draft?"rgba(34,197,94,0.04)":"transparent"}}>
            <span style={{fontFamily:mono,fontSize:9,fontWeight:700,color:"#a3a3a3",width:40}}>{row.slot}</span>
            <span style={{fontFamily:sans,fontSize:13,fontWeight:row.draft?700:500,color:row.draft?"#171717":"#737373",flex:1}}>{row.name}</span>
            {row.draft&&<span style={{fontFamily:mono,fontSize:8,fontWeight:700,color:"#22c55e",background:"rgba(34,197,94,0.1)",padding:"2px 8px",borderRadius:99}}>DRAFTED</span>}
            {row.displaced&&<span style={{fontFamily:mono,fontSize:8,color:"#ef4444",background:"rgba(239,68,68,0.06)",padding:"2px 8px",borderRadius:99}}>→ {row.displaced}</span>}
          </div>)}
        </div>
        <div style={tip}>💡 Depth charts update after every single pick, so you always know which needs are still open and which starters just got replaced.</div>
      </div>

      {/* 10 — Player Profiles */}
      <div id="guide-profiles" className="guide-card" style={{...card,scrollMarginTop:70,transition:"box-shadow 0.2s"}}>
        <div style={sectionNum("10")}>10</div>
        <div style={{width:"100%",height:1,background:"linear-gradient(90deg,#ec4899,#7c3aed,transparent)",margin:"4px 0 12px"}}/>
        <h2 style={h2s}>Player Profiles</h2>
        <p style={desc}>Tap any prospect to open a detailed profile with school logo, measurables, combine data, trait radar chart, and similar player comps.</p>
        {(()=>{const p=demoProspects[0];if(!p)return null;const pos=p.gpos||p.pos;const posTraits=POSITION_TRAITS[pos]||[];const c=POS_COLORS[pos];const vals=posTraits.map(t=>tv({},p.id,t,p.name,p.school));
          return<div style={{background:"#faf9f6",borderRadius:14,border:"1px solid #f0f0f0",padding:"20px",textAlign:"center"}}>
            <SchoolLogo school={p.school} size={48}/>
            <div style={{fontFamily:font,fontSize:20,fontWeight:900,color:"#171717",marginTop:8}}>{p.name}</div>
            <div style={{fontFamily:mono,fontSize:11,color:"#a3a3a3",marginTop:2}}>{p.school}</div>
            <div style={{marginTop:8,display:"inline-flex",alignItems:"baseline",gap:4}}>
              <span style={{fontFamily:font,fontSize:32,fontWeight:900,color:"#16a34a"}}>78</span>
              <span style={{fontFamily:mono,fontSize:9,letterSpacing:2,color:"#a3a3a3",textTransform:"uppercase"}}>grade</span>
            </div>
            <div style={{display:"flex",justifyContent:"center",gap:8,marginTop:8,flexWrap:"wrap"}}>
              {[{label:"HT",val:"6'3\""},{label:"WT",val:"245"}].map(({label,val})=>(
                <div key={label} style={{background:"#fff",border:"1px solid #e5e5e5",borderRadius:8,padding:"4px 12px",textAlign:"center"}}>
                  <div style={{fontFamily:mono,fontSize:7,letterSpacing:1.5,color:"#a3a3a3",textTransform:"uppercase"}}>{label}</div>
                  <div style={{fontFamily:mono,fontSize:12,fontWeight:700,color:"#171717"}}>{val}</div>
                </div>
              ))}
            </div>
            <div style={{display:"flex",justifyContent:"center",marginTop:12}}>
              <RadarChart traits={posTraits} values={vals} color={c} size={140}/>
            </div>
          </div>;
        })()}
      </div>

      {/* 11 — Drag to Reorder */}
      <div id="guide-reorder" className="guide-card" style={{...card,scrollMarginTop:70,transition:"box-shadow 0.2s"}}>
        <div style={sectionNum("11")}>11</div>
        <div style={{width:"100%",height:1,background:"linear-gradient(90deg,#ec4899,#7c3aed,transparent)",margin:"4px 0 12px"}}/>
        <h2 style={h2s}>Drag to Reorder</h2>
        <p style={desc}>Not happy with where someone landed? Grab the drag handle and move any prospect up or down your board to fine-tune your rankings.</p>
        <div style={{border:"1px solid #e5e5e5",borderRadius:10,overflow:"hidden"}}>
          {boardProspects.map((p,i)=>{const c=POS_COLORS[p.gpos||p.pos];const isHighlighted=i===2;return<div key={p.id} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 12px",borderBottom:i<boardProspects.length-1?"1px solid #f5f5f5":"none",background:isHighlighted?"#f5f3ff":"#fff",borderLeft:isHighlighted?`3px solid #7c3aed`:"3px solid transparent"}}>
            <span style={{fontFamily:mono,fontSize:14,color:isHighlighted?"#7c3aed":"#d4d4d4",cursor:"grab",userSelect:"none"}}>⠿</span>
            <span style={{fontFamily:mono,fontSize:11,fontWeight:700,color:"#a3a3a3",width:20,textAlign:"right"}}>{i+1}</span>
            <span style={{fontFamily:mono,fontSize:9,fontWeight:700,color:c,background:`${c}0d`,padding:"2px 8px",borderRadius:99}}>{p.gpos||p.pos}</span>
            <SchoolLogo school={p.school} size={20}/>
            <span style={{fontFamily:sans,fontSize:13,fontWeight:600,color:"#171717",flex:1}}>{p.name}</span>
          </div>;})}
        </div>
        <div style={tip}>💡 Your reordering persists — drag changes are saved and reflected in your exported board.</div>
      </div>
    </div>

    {/* Bottom CTA */}
    <div style={{maxWidth:720,margin:"40px auto",padding:"0 24px"}}>
      <div style={{background:"linear-gradient(135deg,#0f172a,#1e293b)",borderRadius:16,padding:"32px 28px",textAlign:"center",position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",top:0,left:0,right:0,height:3,background:"linear-gradient(90deg,#ec4899,#7c3aed)"}}/>
        <h2 style={{fontFamily:font,fontSize:24,fontWeight:900,color:"#fff",margin:"0 0 12px"}}>ready to build your board?</h2>
        <p style={{fontFamily:sans,fontSize:14,color:"rgba(255,255,255,0.6)",margin:"0 0 20px"}}>450+ prospects. Every trait. The most realistic mock draft ever built.</p>
        <button onClick={onBack} style={{fontFamily:sans,fontSize:14,fontWeight:700,color:"#fff",background:"linear-gradient(135deg,#ec4899,#7c3aed)",border:"none",borderRadius:99,padding:"12px 32px",cursor:"pointer"}}>start now →</button>
      </div>
    </div>

    {/* Footer */}
    <div style={{textAlign:"center",padding:"20px 24px 40px",display:"flex",justifyContent:"center",gap:20}}>
      <a href="/privacy.html" style={{fontFamily:mono,fontSize:10,color:"#a3a3a3",textDecoration:"none"}}>privacy</a>
      <a href="/terms.html" style={{fontFamily:mono,fontSize:10,color:"#a3a3a3",textDecoration:"none"}}>terms</a>
    </div>
  </div>);
}

// ============================================================
// OG Preview: renders a 1200x630 composite for Open Graph image capture
// ============================================================
function OGRadar({traits,values,color,size=200}){
  // Like RadarChart but with full trait labels
  const cx=size/2,cy=size/2,r=size/2-32,n=traits.length;
  const angles=traits.map((_,i)=>(Math.PI*2*i)/n-Math.PI/2);
  const pv=angles.map((a,i)=>{const v=(values[i]||50)/100;return[cx+r*v*Math.cos(a),cy+r*v*Math.sin(a)];});
  return(<svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
    {[.25,.5,.75,1].map(lv=><polygon key={lv} points={angles.map(a=>`${cx+r*lv*Math.cos(a)},${cy+r*lv*Math.sin(a)}`).join(" ")} fill="none" stroke="#e5e5e5" strokeWidth="0.5"/>)}
    {angles.map((a,i)=><line key={i} x1={cx} y1={cy} x2={cx+r*Math.cos(a)} y2={cy+r*Math.sin(a)} stroke="#e5e5e5" strokeWidth="0.5"/>)}
    <polygon points={pv.map(p=>p.join(",")).join(" ")} fill={`${color}18`} stroke={color} strokeWidth="2"/>
    {pv.map((p,i)=><circle key={i} cx={p[0]} cy={p[1]} r="3" fill={color}/>)}
    {traits.map((t,i)=>{const lr=r+22;const x=cx+lr*Math.cos(angles[i]);const y=cy+lr*Math.sin(angles[i]);
      return<text key={t} x={x} y={y} textAnchor="middle" dominantBaseline="middle" style={{fontSize:"7.5px",fill:"#737373",fontFamily:"'DM Sans',sans-serif",fontWeight:500}}>{t}</text>;
    })}
  </svg>);
}
function OGPreview(){
  const ref=useRef(null);
  const download=async()=>{
    const html2canvas=(await import("html2canvas")).default;
    const canvas=await html2canvas(ref.current,{width:1200,height:630,scale:2,backgroundColor:"#faf9f6",useCORS:true});
    const a=document.createElement("a");a.href=canvas.toDataURL("image/png");a.download="og-image.png";a.click();
  };

  const ogProspects=[
    PROSPECTS.find(p=>p.name==="Rueben Bain Jr."),
    PROSPECTS.find(p=>p.name==="Caleb Downs"),
    PROSPECTS.find(p=>p.name==="Francis Mauigoa"),
    PROSPECTS.find(p=>p.name==="Garrett Nussmeier"),
    PROSPECTS.find(p=>p.name==="Jordyn Tyson"),
    PROSPECTS.find(p=>p.name==="David Bailey"),
    PROSPECTS.find(p=>p.name==="Arvell Reese"),
  ].filter(Boolean);

  const pairA=PROSPECTS.find(p=>p.name==="Rueben Bain Jr.");
  const pairB=PROSPECTS.find(p=>p.name==="David Bailey");
  const profileP=PROSPECTS.find(p=>p.name==="Garrett Nussmeier");
  const teamLogos=["Raiders","Jets","Cardinals","Titans","Giants","Browns","Commanders","Saints","Chiefs","Bengals","Dolphins","Cowboys","Rams","Ravens","Buccaneers","Lions"];

  return(
    <div style={{minHeight:"100vh",background:"#1a1a1a",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:24,padding:40}}>
      <div style={{fontFamily:sans,fontSize:14,color:"#a3a3a3"}}>OG Image Preview — 1200 x 630</div>
      <div ref={ref} style={{width:1200,height:630,background:"#faf9f6",overflow:"hidden",display:"flex",flexDirection:"column"}}>

        {/* ===== CONTENT ===== */}
        <div style={{flex:1,display:"flex",padding:32,gap:24}}>

          {/* LEFT — Hero + Big Board */}
          <div style={{width:420,display:"flex",flexDirection:"column",gap:20,flexShrink:0}}>
            {/* Hero */}
            <div>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
                <img src="/logo.png" alt="" style={{width:75,height:"auto"}}/>
                <div>
                  <div style={{fontFamily:mono,fontSize:8,letterSpacing:3,color:"#a3a3a3",textTransform:"uppercase"}}>2026 NFL Draft</div>
                  <div style={{fontFamily:font,fontSize:32,fontWeight:900,color:"#171717",lineHeight:1,letterSpacing:-1.5}}>big board lab</div>
                </div>
              </div>
              <div style={{fontFamily:sans,fontSize:13,color:"#737373",lineHeight:1.5}}>Rank prospects. Grade every trait. Run the most realistic mock draft ever built.</div>
              <div style={{width:80,height:3,background:"linear-gradient(90deg,#ec4899,#7c3aed)",borderRadius:99,marginTop:10}}/>
            </div>

            {/* Mini Big Board */}
            <div style={{background:"#fff",border:"1px solid #e5e5e5",borderRadius:12,overflow:"hidden",flex:1}}>
              <div style={{padding:"10px 14px",borderBottom:"1px solid #f0f0f0",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div style={{fontFamily:font,fontSize:13,fontWeight:900,color:"#171717"}}>Big Board</div>
                <div style={{display:"flex",gap:4}}>
                  {["QB","WR","EDGE","OT","S"].map(g=><span key={g} style={{fontFamily:mono,fontSize:7,fontWeight:700,color:POS_COLORS[g],background:`${POS_COLORS[g]}0d`,padding:"2px 6px",borderRadius:99}}>{g}</span>)}
                </div>
              </div>
              {ogProspects.map((p,i)=>{const c=POS_COLORS[p.gpos||p.pos];const posTraits=POSITION_TRAITS[p.gpos||p.pos]||[];const vals=posTraits.map(t=>tv({},p.id,t,p.name,p.school));return<div key={p.id} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 14px",borderBottom:i<ogProspects.length-1?"1px solid #f5f5f5":"none"}}>
                <span style={{fontFamily:mono,fontSize:11,fontWeight:700,color:"#d4d4d4",width:18,textAlign:"right"}}>{i+1}</span>
                <span style={{fontFamily:mono,fontSize:8,fontWeight:700,color:c,background:`${c}0d`,padding:"2px 7px",borderRadius:99}}>{p.gpos||p.pos}</span>
                <SchoolLogo school={p.school} size={20}/>
                <span style={{fontFamily:sans,fontSize:12,fontWeight:600,color:"#171717",flex:1}}>{p.name}</span>
                <MiniRadar values={vals} color={c} size={22}/>
              </div>;})}
            </div>
          </div>

          {/* RIGHT — 2x2 feature cards */}
          <div style={{flex:1,display:"grid",gridTemplateColumns:"1fr 1fr",gridTemplateRows:"1fr 1fr",gap:16}}>

            {/* Card 1 — Pair Ranking */}
            <div style={{background:"#fff",border:"1px solid #e5e5e5",borderRadius:12,padding:16,display:"flex",flexDirection:"column"}}>
              <div style={{fontFamily:sans,fontSize:11,fontWeight:700,color:"#171717",marginBottom:4}}>Head-to-Head Rankings</div>
              <div style={{fontFamily:sans,fontSize:9,color:"#a3a3a3",marginBottom:10}}>Pick who you'd draft first</div>
              <div style={{flex:1,display:"flex",gap:10,alignItems:"center",justifyContent:"center"}}>
                {pairA&&pairB&&(()=>{const cA=POS_COLORS[pairA.gpos||pairA.pos];const cB=POS_COLORS[pairB.gpos||pairB.pos];
                  const card=(p,pc,sel)=><div style={{background:sel?`${pc}06`:"#faf9f6",border:sel?`2px solid ${pc}`:`1.5px solid ${pc}22`,borderRadius:10,padding:"10px 14px",textAlign:"center"}}>
                    <SchoolLogo school={p.school} size={28}/>
                    <div style={{fontFamily:font,fontSize:12,fontWeight:800,color:"#171717",marginTop:4,lineHeight:1.1}}>{shortName(p.name)}</div>
                    <span style={{fontFamily:mono,fontSize:8,fontWeight:700,color:pc,background:`${pc}0d`,padding:"1px 6px",borderRadius:99,display:"inline-block",marginTop:4}}>{p.gpos||p.pos}</span>
                  </div>;
                  return<>{card(pairA,cA,true)}<span style={{fontFamily:font,fontSize:14,fontWeight:900,color:"#d4d4d4"}}>vs</span>{card(pairB,cB,false)}</>;
                })()}
              </div>
              <div style={{display:"flex",gap:5,justifyContent:"center",marginTop:8}}>
                {["coin flip","leaning","confident","lock"].map((l,i)=><span key={l} style={{fontFamily:sans,fontSize:7,fontWeight:600,background:i>=2?"#171717":"#fff",color:i>=2?"#faf9f6":"#525252",border:`1px solid ${i>=2?"#171717":"#e5e5e5"}`,borderRadius:99,padding:"2px 8px"}}>{l}</span>)}
              </div>
            </div>

            {/* Card 2 — Trait Grading */}
            <div style={{background:"#fff",border:"1px solid #e5e5e5",borderRadius:12,padding:16,display:"flex",flexDirection:"column"}}>
              <div style={{fontFamily:sans,fontSize:11,fontWeight:700,color:"#171717",marginBottom:4}}>Spider Charts & Trait Grading</div>
              <div style={{fontFamily:sans,fontSize:9,color:"#a3a3a3",marginBottom:10}}>Slide traits, watch grades update</div>
              {(()=>{if(!profileP)return null;const pos=profileP.gpos||profileP.pos;const posTraits=POSITION_TRAITS[pos]||[];const c=POS_COLORS[pos];const vals=[82,75,68,72,78,65];
                return<div style={{flex:1,display:"flex",alignItems:"center",gap:10}}>
                  <div style={{display:"flex",flexDirection:"column",gap:4,flex:1}}>
                    {posTraits.map((t,i)=>{const v=vals[i]||60;return<div key={t} style={{display:"flex",alignItems:"center",gap:4}}>
                      <span style={{fontFamily:mono,fontSize:7,fontWeight:600,color:"#a3a3a3",width:22,textAlign:"right",flexShrink:0}}>{TRAIT_ABBREV[t]||t.slice(0,3).toUpperCase()}</span>
                      <div style={{flex:1,height:4,background:"#f0f0f0",borderRadius:99,overflow:"hidden"}}><div style={{width:`${v}%`,height:"100%",background:"linear-gradient(90deg,#ec4899,#7c3aed)",borderRadius:99}}/></div>
                      <span style={{fontFamily:mono,fontSize:7,fontWeight:700,color:"#525252",width:14,textAlign:"right"}}>{v}</span>
                    </div>;})}
                  </div>
                  <OGRadar traits={posTraits} values={vals} color={c} size={150}/>
                </div>;
              })()}
            </div>

            {/* Card 3 — 32 AI GMs */}
            <div style={{background:"#fff",border:"1px solid #e5e5e5",borderRadius:12,padding:16,display:"flex",flexDirection:"column"}}>
              <div style={{fontFamily:sans,fontSize:11,fontWeight:700,color:"#171717",marginBottom:4}}>Mock Draft vs 32 AI GMs</div>
              <div style={{fontFamily:sans,fontSize:9,color:"#a3a3a3",marginBottom:10}}>Real team tendencies & trade logic</div>
              <div style={{flex:1,display:"flex",flexDirection:"column",justifyContent:"center",gap:8}}>
                <div style={{display:"grid",gridTemplateColumns:"repeat(8,1fr)",gap:6}}>
                  {teamLogos.map(t=><div key={t} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
                    <NFLTeamLogo team={t} size={22}/>
                    <span style={{fontFamily:mono,fontSize:6,color:"#a3a3a3",fontWeight:600}}>{NFL_TEAM_ABR[t]}</span>
                  </div>)}
                </div>
                <div style={{textAlign:"center"}}>
                  <span style={{fontFamily:sans,fontSize:10,fontWeight:700,color:"#fff",background:"linear-gradient(135deg,#ec4899,#7c3aed)",borderRadius:99,padding:"5px 18px",display:"inline-block"}}>start draft</span>
                </div>
              </div>
            </div>

            {/* Card 4 — Filter by Traits + Depth Charts */}
            <div style={{background:"#fff",border:"1px solid #e5e5e5",borderRadius:12,padding:16,display:"flex",flexDirection:"column"}}>
              <div style={{fontFamily:sans,fontSize:11,fontWeight:700,color:"#171717",marginBottom:4}}>Filter by Elite Traits</div>
              <div style={{fontFamily:sans,fontSize:9,color:"#a3a3a3",marginBottom:8}}>Rank & draft by specific skills</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:4,marginBottom:10}}>
                {["Pass Rush","Speed","Man Coverage","Route Running","Accuracy","Hands"].map(t=><span key={t} style={{fontFamily:sans,fontSize:7,fontWeight:600,color:"#7c3aed",background:"#f5f3ff",border:"1px solid #ede9fe",borderRadius:99,padding:"2px 7px",display:"inline-flex",alignItems:"center",gap:2}}>
                  <span style={{fontSize:7}}>{TRAIT_EMOJI[t]}</span>{t}
                </span>)}
              </div>
              <div style={{flex:1,borderRadius:8,overflow:"hidden",border:"1px solid #f0f0f0"}}>
                <div style={{fontFamily:mono,fontSize:7,letterSpacing:1,color:"#a3a3a3",textTransform:"uppercase",padding:"5px 8px",borderBottom:"1px solid #f0f0f0",display:"flex",alignItems:"center",gap:4}}>
                  <span style={{fontSize:8}}>🚀</span> ranking by: pass rush
                </div>
                {[{name:"Bain Jr.",pos:"EDGE",val:92},{name:"Parker",pos:"EDGE",val:88},{name:"Bailey",pos:"DL",val:85},{name:"Halton",pos:"DL",val:82}].map((p,i)=>{const c=POS_COLORS[p.pos];return<div key={p.name} style={{display:"flex",alignItems:"center",gap:5,padding:"3px 8px",borderBottom:i<3?"1px solid #f8f8f8":"none"}}>
                  <span style={{fontFamily:mono,fontSize:7,fontWeight:700,color:c,background:`${c}0d`,padding:"1px 5px",borderRadius:99}}>{p.pos}</span>
                  <span style={{fontFamily:sans,fontSize:9,fontWeight:600,color:"#171717",flex:1}}>{p.name}</span>
                  <span style={{fontFamily:mono,fontSize:9,fontWeight:700,color:"#7c3aed"}}>{p.val}</span>
                </div>;})}
              </div>
            </div>
          </div>
        </div>

        {/* ===== BOTTOM STRIP ===== */}
        <div style={{height:36,background:"#171717",display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 32px",flexShrink:0,position:"relative"}}>
          <div style={{position:"absolute",top:0,left:0,right:0,height:3,background:"linear-gradient(90deg,#ec4899,#7c3aed)"}}/>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <img src="/logo.png" alt="" style={{height:16,filter:"brightness(0) invert(1)"}}/>
            <span style={{fontFamily:font,fontSize:13,fontWeight:900,color:"#fff",letterSpacing:"-0.02em"}}>bigboardlab.com</span>
          </div>
          <div style={{display:"flex",gap:16}}>
            {["450+ Prospects","Trait Grading","32 AI GMs","Live Depth Charts","Share Results"].map(t=><span key={t} style={{fontFamily:sans,fontSize:10,color:"#737373"}}>{t}</span>)}
          </div>
        </div>
      </div>

      <button onClick={download} style={{fontFamily:sans,fontSize:14,fontWeight:700,color:"#fff",background:"#7c3aed",border:"none",padding:"12px 32px",borderRadius:8,cursor:"pointer"}}>Download as PNG</button>
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
  const[showOG,setShowOG]=useState(()=>window.location.hash==="#og-preview");
  const[showGuide,setShowGuide]=useState(()=>window.location.pathname==='/guide');
  const[isGuest,setIsGuest]=useState(false);
  const[authPrompt,setAuthPrompt]=useState(null);
  const authSourceRef=useRef(null);

  useEffect(()=>{
    const onHash=()=>{setShowAdmin(window.location.hash==="#admin");setShowOG(window.location.hash==="#og-preview");};
    window.addEventListener("hashchange",onHash);
    return()=>window.removeEventListener("hashchange",onHash);
  },[]);

  useEffect(()=>{
    const onPop=()=>{setShowGuide(window.location.pathname==='/guide');};
    window.addEventListener("popstate",onPop);
    return()=>window.removeEventListener("popstate",onPop);
  },[]);

  const navigateToGuide=useCallback(()=>{window.history.pushState({},'','/guide');setShowGuide(true);},[]);

  useEffect(()=>{
    supabase.auth.getSession().then(({data:{session}})=>{
      setUser(session?.user||null);
      if(session?.user)trackEvent(session.user.id,'session_return');
      setLoading(false);
    });
    const{data:{subscription}}=supabase.auth.onAuthStateChange((event,session)=>{
      setUser(session?.user||null);
      if(session?.user&&event==='SIGNED_IN'){const created=new Date(session.user.created_at);const isNew=(Date.now()-created.getTime())<10000;trackEvent(session.user.id,isNew?'signup':'login',isNew?{source:authSourceRef.current||'homepage'}:{});}
    });
    return()=>subscription.unsubscribe();
  },[]);

  const signOut=async()=>{await supabase.auth.signOut();setUser(null);};

  if(loading)return<div style={{minHeight:"100vh",background:"#faf9f6",display:"flex",alignItems:"center",justifyContent:"center"}}><p style={{fontFamily:"'DM Sans',sans-serif",fontSize:14,color:"#a3a3a3"}}>loading...</p></div>;
  if(showGuide)return<GuidePage onBack={()=>{window.history.pushState({},'','/');setShowGuide(false);}}/>;
  if(showOG)return<OGPreview/>;
  if(!user&&!isGuest)return<AuthScreen onSkip={()=>setIsGuest(true)} onOpenGuide={navigateToGuide}/>;
  if(showAdmin&&user&&ADMIN_EMAILS.includes(user.email))return<AdminDashboard user={user} onBack={()=>{window.location.hash="";setShowAdmin(false);}}/>;
  return<>
    <DraftBoard user={user} onSignOut={user?signOut:()=>setIsGuest(false)} isGuest={!user} onOpenGuide={navigateToGuide} onRequireAuth={(msg)=>{
      const src=msg.includes('vote')||msg.includes('big board')?'pair rank':msg.includes('trait')||msg.includes('grade')||msg.includes('slider')?'sliders':msg.includes('mock')||msg.includes('draft')?'mock draft':msg.includes('reorder')?'pair rank':msg.includes('note')?'notes':msg.includes('guys')?'my guys':msg.includes('share')?'share':msg.includes('save')?'save':'homepage';
      authSourceRef.current=src;
      setAuthPrompt(msg);
    }}/>
    {authPrompt&&<AuthModal message={authPrompt} onClose={()=>setAuthPrompt(null)}/>}
  </>;
}
