import { useState, useEffect, useCallback, useMemo, useRef, Component } from "react";
import { supabase } from "./supabase.js";
import { track, trackOnce, setTrackingUser } from "./track.js";
import MockDraftSim from "./MockDraftSim.jsx";
import { CONSENSUS_BOARD, getConsensusRank, getConsensusGrade, TEAM_NEEDS_DETAILED } from "./consensusData.js";
import { getProspectStats } from "./prospectStats.js";

class ErrorBoundary extends Component{
  constructor(props){super(props);this.state={hasError:false,error:null};}
  static getDerivedStateFromError(error){return{hasError:true,error};}
  componentDidCatch(error,info){console.error('Big Board Lab error:',error,info);}
  render(){if(this.state.hasError){const sans="'DM Sans','Helvetica Neue',sans-serif";const mono="'DM Mono','Courier New',monospace";return(<div style={{minHeight:"100vh",background:"#faf9f6",display:"flex",alignItems:"center",justifyContent:"center"}}><div style={{textAlign:"center",maxWidth:400,padding:24}}><div style={{fontSize:48,marginBottom:16}}>🏈</div><h1 style={{fontFamily:sans,fontSize:20,fontWeight:700,color:"#171717",marginBottom:8}}>something went wrong</h1><p style={{fontFamily:sans,fontSize:14,color:"#a3a3a3",marginBottom:20,lineHeight:1.5}}>your board data is safe. try reloading.</p><button onClick={()=>window.location.reload()} style={{fontFamily:sans,fontSize:14,fontWeight:700,padding:"12px 28px",background:"#171717",color:"#faf9f6",border:"none",borderRadius:99,cursor:"pointer"}}>reload</button><details style={{marginTop:20,textAlign:"left"}}><summary style={{fontFamily:mono,fontSize:10,color:"#d4d4d4",cursor:"pointer"}}>error details</summary><pre style={{fontFamily:mono,fontSize:10,color:"#a3a3a3",marginTop:8,whiteSpace:"pre-wrap",wordBreak:"break-all"}}>{this.state.error?.toString()}</pre></details></div></div>);}return this.props.children;}
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
const SCHOOL_ESPN_ID={"Alabama":333,"Arizona State":9,"Arizona":12,"Arkansas":8,"Auburn":2,"BYU":252,"Baylor":239,"Boise State":68,"Boston College":103,"Buffalo":2084,"Cal":25,"California":25,"Central Michigan":2117,"Cincinnati":2132,"Clemson":228,"Dartmouth":159,"Duke":150,"Florida International":2229,"Florida State":52,"Florida":57,"Georgia State":2247,"Georgia Tech":59,"Georgia":61,"Houston":248,"Illinois":356,"Incarnate Word":2916,"Indiana":84,"Iowa State":66,"Iowa":2294,"James Madison":256,"John Carroll":2320,"Kansas State":2306,"Kansas":2305,"Kentucky":96,"LSU":99,"Louisiana Tech":2348,"Louisiana-Lafayette":309,"Louisville":97,"Maryland":120,"Memphis":235,"Miami":2390,"Miami (FL)":2390,"Miami (OH)":193,"Michigan State":127,"Michigan":130,"Minnesota":135,"Mississippi State":344,"Mississippi":145,"Missouri":142,"Montana":149,"N.C. State":152,"NC State":152,"Navy":2426,"Nebraska":158,"New Mexico":167,"North Carolina":153,"North Dakota State":2449,"Northwestern":77,"Notre Dame":87,"Ohio State":194,"Oklahoma":201,"Oregon":2483,"Oregon State":204,"Penn State":213,"Pittsburgh":221,"Rutgers":164,"SMU":2567,"San Diego State":21,"Slippery Rock":2596,"South Alabama":6,"South Carolina":2579,"South Carolina State":2569,"Southeastern Louisiana":2545,"Southern Miss":2572,"Stanford":24,"Stephen F. Austin":2617,"Syracuse":183,"TCU":2628,"Tennessee":2633,"Texas A&M":245,"Texas State":326,"Texas Tech":2641,"Texas":251,"Toledo":2649,"UCF":2116,"UCLA":26,"UConn":41,"USC":30,"UTSA":2636,"Utah":254,"Vanderbilt":238,"Virginia":258,"Virginia Tech":259,"Virginia Union":2762,"Wake Forest":154,"Washington":264,"Western Michigan":2711,"Wisconsin":275,"Wyoming":2751};
function schoolLogo(s){const id=SCHOOL_ESPN_ID[s];return id?`https://a.espncdn.com/i/teamlogos/ncaa/500/${id}.png`:null;}
const POSITION_TRAITS={QB:["Arm Strength","Accuracy","Pocket Presence","Mobility","Decision Making","Leadership"],RB:["Vision","Burst","Power","Elusiveness","Pass Catching","Pass Protection"],WR:["Route Running","Separation","Hands","YAC Ability","Speed","Contested Catches"],TE:["Receiving","Route Running","Blocking","Athleticism","Hands","Versatility"],OT:["Pass Protection","Run Blocking","Footwork","Anchor","Athleticism","Versatility"],IOL:["Pass Protection","Run Blocking","Pulling","Strength","Awareness","Versatility"],EDGE:["Pass Rush","Bend","First Step","Hand Usage","Motor","Run Defense"],DL:["Pass Rush","Run Defense","First Step","Hand Usage","Motor","Versatility"],LB:["Tackling","Coverage","Blitz Ability","Instincts","Athleticism","Range"],CB:["Coverage","Ball Skills","Tackling","Speed","Press","Football IQ"],S:["Coverage","Range","Ball Skills","Tackling","Versatility","Football IQ"],"K/P":["Leg Strength","Accuracy","Consistency","Clutch","Directional Control","Hang Time"]};
const TRAIT_EMOJI={"Arm Strength":"💪","Accuracy":"🎯","Pocket Presence":"🧊","Mobility":"🏃","Decision Making":"🧠","Leadership":"👑","Vision":"👁️","Burst":"⚡","Power":"🦬","Elusiveness":"💨","Pass Catching":"🧤","Pass Protection":"🛡️","Route Running":"✂️","Separation":"🌀","Hands":"🤲","YAC Ability":"🔥","Speed":"🏎️","Contested Catches":"🏀","Receiving":"📡","Blocking":"🧱","Athleticism":"🦅","Versatility":"🔄","Run Blocking":"⛏️","Footwork":"👟","Anchor":"⚓","Pulling":"🚂","Strength":"🏋️","Awareness":"📡","Pass Rush":"🌪️","Bend":"🐍","First Step":"⚡","Hand Usage":"🤚","Motor":"🔋","Run Defense":"🧱","Tackling":"💥","Coverage":"🪂","Blitz Ability":"🚀","Instincts":"🧠","Range":"📡","Ball Skills":"🧲","Press":"✋","Football IQ":"📋","Leg Strength":"🦵","Consistency":"📏","Clutch":"❄️","Directional Control":"🧭","Hang Time":"⏱️"};
const TRAIT_WEIGHTS={QB:{"Accuracy":.25,"Decision Making":.22,"Pocket Presence":.18,"Arm Strength":.15,"Leadership":.12,"Mobility":.08},RB:{"Vision":.22,"Elusiveness":.20,"Burst":.18,"Power":.15,"Pass Catching":.13,"Pass Protection":.12},WR:{"Route Running":.22,"Separation":.20,"Hands":.18,"Speed":.16,"YAC Ability":.13,"Contested Catches":.11},TE:{"Receiving":.20,"Blocking":.20,"Route Running":.18,"Hands":.16,"Athleticism":.14,"Versatility":.12},OT:{"Pass Protection":.25,"Footwork":.20,"Anchor":.18,"Run Blocking":.15,"Athleticism":.12,"Versatility":.10},IOL:{"Run Blocking":.22,"Pass Protection":.22,"Strength":.18,"Pulling":.14,"Awareness":.13,"Versatility":.11},EDGE:{"Pass Rush":.24,"First Step":.20,"Bend":.18,"Hand Usage":.15,"Motor":.13,"Run Defense":.10},DL:{"Run Defense":.22,"Pass Rush":.20,"First Step":.18,"Hand Usage":.16,"Motor":.14,"Versatility":.10},LB:{"Instincts":.22,"Tackling":.20,"Coverage":.18,"Athleticism":.15,"Blitz Ability":.13,"Range":.12},CB:{"Coverage":.24,"Ball Skills":.20,"Speed":.18,"Press":.15,"Football IQ":.13,"Tackling":.10},S:{"Coverage":.22,"Range":.20,"Ball Skills":.18,"Tackling":.16,"Football IQ":.14,"Versatility":.10},"K/P":{"Accuracy":.25,"Leg Strength":.22,"Consistency":.20,"Clutch":.13,"Directional Control":.12,"Hang Time":.08}};
const POSITION_GROUPS=["QB","RB","WR","TE","OT","IOL","EDGE","DL","LB","CB","S","K/P"];
const POS_COLORS={QB:"#1e3a5f",RB:"#5b21b6",WR:"#0d9488",TE:"#0891b2",OT:"#b45309",IOL:"#d97706",OL:"#b45309",EDGE:"#15803d",DL:"#166534",LB:"#4338ca",CB:"#0f766e",S:"#047857",DB:"#0f766e","K/P":"#78716c"};
const INITIAL_ELO=1500;
function expectedScore(rA,rB){return 1/(1+Math.pow(10,(rB-rA)/400));}
function eloUpdate(rA,rB,aWon,k=32){const eA=expectedScore(rA,rB);return{newA:rA+k*((aWon?1:0)-eA),newB:rB+k*((aWon?0:1)-(1-eA))};}
// Generate matchups in consensus-priority tiers. Top 15 first, then expand.
function generateMatchups(ids,consensusOrder){
  // Sort ids by consensus order (best first)
  const sorted=[...ids].sort((a,b)=>(consensusOrder[a]||999)-(consensusOrder[b]||999));
  const tier1=sorted.slice(0,15);const tier2=sorted.slice(15,30);const rest=sorted.slice(30);
  const m=[];const seen=new Set();
  function addPairs(arr){for(let i=0;i<arr.length;i++)for(let j=i+1;j<arr.length;j++){const key=arr[i]+'_'+arr[j];if(!seen.has(key)){seen.add(key);m.push([arr[i],arr[j]]);}}}
  function addCross(a1,a2){a1.forEach(x=>a2.forEach(y=>{const key=x+'_'+y;if(!seen.has(key)){seen.add(key);m.push([x,y]);}}));}
  // Tier 1 internal matchups first (most important)
  addPairs(tier1);
  // Tier 1 vs Tier 2 (next priority)
  addCross(tier1,tier2);
  // Tier 2 internal
  addPairs(tier2);
  // Top tiers vs rest
  addCross(tier1,rest);addCross(tier2,rest);
  // Rest internal (lowest priority)
  addPairs(rest);
  return m;
}
function getNextMatchup(mups,done,ratings){const rem=mups.filter(m=>!done.has(`${m[0]}-${m[1]}`));if(!rem.length)return null;
  // Prioritize matchups in order they were generated (tier 1 first)
  // Among early matchups, prefer close Elo ratings for better signal
  const batch=rem.slice(0,Math.min(20,rem.length));
  batch.sort((a,b)=>Math.abs((ratings[a[0]]||1500)-(ratings[a[1]]||1500))-Math.abs((ratings[b[0]]||1500)-(ratings[b[1]]||1500)));
  return batch[Math.floor(Math.random()*Math.min(3,batch.length))];
}
const DRAFT_ORDER=[{pick:1,team:"Raiders"},{pick:2,team:"Jets"},{pick:3,team:"Cardinals"},{pick:4,team:"Titans"},{pick:5,team:"Giants"},{pick:6,team:"Browns"},{pick:7,team:"Commanders"},{pick:8,team:"Saints"},{pick:9,team:"Chiefs"},{pick:10,team:"Bengals"},{pick:11,team:"Dolphins"},{pick:12,team:"Cowboys"},{pick:13,team:"Rams"},{pick:14,team:"Ravens"},{pick:15,team:"Buccaneers"},{pick:16,team:"Jets"},{pick:17,team:"Lions"},{pick:18,team:"Vikings"},{pick:19,team:"Panthers"},{pick:20,team:"Cowboys"},{pick:21,team:"Steelers"},{pick:22,team:"Chargers"},{pick:23,team:"Eagles"},{pick:24,team:"Browns"},{pick:25,team:"Bears"},{pick:26,team:"Bills"},{pick:27,team:"49ers"},{pick:28,team:"Texans"},{pick:29,team:"Rams"},{pick:30,team:"Broncos"},{pick:31,team:"Patriots"},{pick:32,team:"Seahawks"}];
const NFL_TEAM_ABR={"Raiders":"LV","Jets":"NYJ","Cardinals":"ARI","Titans":"TEN","Giants":"NYG","Browns":"CLE","Commanders":"WAS","Saints":"NO","Chiefs":"KC","Bengals":"CIN","Dolphins":"MIA","Cowboys":"DAL","Rams":"LA","Ravens":"BAL","Buccaneers":"TB","Lions":"DET","Vikings":"MIN","Panthers":"CAR","Steelers":"PIT","Chargers":"LAC","Eagles":"PHI","Bears":"CHI","Bills":"BUF","49ers":"SF","Texans":"HOU","Broncos":"DEN","Patriots":"NE","Seahawks":"SEA","Falcons":"ATL","Colts":"IND","Jaguars":"JAX","Packers":"GB"};
const NFL_TEAM_ESPN={"Raiders":13,"Jets":20,"Cardinals":22,"Titans":10,"Giants":19,"Browns":5,"Commanders":28,"Saints":18,"Chiefs":12,"Bengals":4,"Dolphins":15,"Cowboys":6,"Rams":14,"Ravens":33,"Buccaneers":27,"Lions":8,"Vikings":16,"Panthers":29,"Steelers":23,"Chargers":24,"Eagles":21,"Bears":3,"Bills":2,"49ers":25,"Texans":34,"Broncos":7,"Patriots":17,"Seahawks":26,"Falcons":1,"Colts":11,"Jaguars":30,"Packers":9};
function nflLogo(team){const id=NFL_TEAM_ESPN[team];return id?`https://a.espncdn.com/i/teamlogos/nfl/500/${id}.png`:null;}
function NFLTeamLogo({team,size=20}){const[err,setErr]=useState(false);const url=nflLogo(team);if(!url||err)return<span style={{fontFamily:"monospace",fontSize:size*0.5,color:"#a3a3a3"}}>{NFL_TEAM_ABR[team]||team}</span>;return<img src={url} alt={team} width={size} height={size} onError={()=>setErr(true)} style={{objectFit:"contain",flexShrink:0}}/>;}
const MIN_COMPS=1;
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

  return(
    <div style={{minHeight:"100vh",background:"#faf9f6",fontFamily:font,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{maxWidth:400,width:"100%",padding:"0 24px"}}>
        <div style={{textAlign:"center",marginBottom:36}}>
          <img src="/logo.png" alt="Big Board Lab" style={{width:120,height:"auto",marginBottom:16}}/>
          <p style={{fontFamily:mono,fontSize:11,letterSpacing:3,color:"#a3a3a3",textTransform:"uppercase",margin:"0 0 12px"}}>2026 NFL Draft</p>
          <h1 style={{fontSize:48,fontWeight:900,lineHeight:0.95,color:"#171717",margin:"0 0 12px",letterSpacing:-2}}>big board lab</h1>
          <p style={{fontFamily:sans,fontSize:14,color:"#a3a3a3",lineHeight:1.5}}>450+ prospects. build your board.<br/>run mock drafts. share your takes.</p>
        </div>
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
        <p style={{textAlign:"center",marginTop:16}}><a href="/privacy.html" style={{fontFamily:mono,fontSize:10,color:"#a3a3a3",textDecoration:"none"}} onMouseEnter={e=>e.currentTarget.style.textDecoration="underline"} onMouseLeave={e=>e.currentTarget.style.textDecoration="none"}>privacy policy</a></p>
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
  const[saveFailed,setSaveFailed]=useState(false);
  const[lastSaved,setLastSaved]=useState(null);
  const[profilePlayer,setProfilePlayer]=useState(null);
  const[notes,setNotes]=useState({});
  const[communityBoard,setCommunityBoard]=useState(null);
  const[showMockDraft,setShowMockDraft]=useState(false);
  const[showOnboarding,setShowOnboarding]=useState(()=>{try{return !localStorage.getItem('bbl_onboarded');}catch(e){return true;}});

  // Consensus Top 50 (aggregated from major draft media)
  const CONSENSUS=useMemo(()=>{
    if(CONSENSUS_BOARD&&CONSENSUS_BOARD.length>0){
      return CONSENSUS_BOARD.slice(0,50).map((entry,i)=>({name:entry.name||entry,rank:i+1}));
    }
    return PROSPECTS.slice(0,50).map((p,i)=>({name:p.name,rank:i+1}));
  },[]);

  // Team needs for mock draft
  const TEAM_NEEDS=useMemo(()=>({"Raiders":["QB","WR","CB"],"Jets":["OL","WR","DL"],"Cardinals":["OL","DL","DB"],"Titans":["DL","WR","OL"],"Giants":["WR","OL","QB"],"Browns":["QB","WR","OL"],"Commanders":["DL","OL","DB"],"Saints":["QB","OL","DL"],"Chiefs":["WR","OL","DB"],"Bengals":["OL","DL","DB"],"Dolphins":["QB","OL","DL"],"Cowboys":["DL","DB","OL"],"Rams":["DB","DL","OL"],"Ravens":["DL","WR","OL"],"Buccaneers":["OL","WR","DL"],"Lions":["DL","DB","LB"],"Vikings":["OL","DL","DB"],"Panthers":["DB","LB","DL"],"Steelers":["QB","WR","OL"],"Chargers":["OL","DL","LB"],"Eagles":["DL","LB","DB"],"Bears":["WR","OL","DB"],"Bills":["OL","WR","DL"],"49ers":["WR","DB","DL"],"Texans":["OL","DL","DB"],"Broncos":["OL","WR","DL"],"Patriots":["OL","WR","DL"],"Seahawks":["DL","OL","LB"],"Falcons":["OL","DL","DB"],"Colts":["OL","DL","WR"],"Jaguars":["DL","DB","OL"],"Packers":["DB","WR","DL"]}),[]);

  // Load board from Supabase on mount
  useEffect(()=>{
    (async()=>{
      try{
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
        if(d.winCount)setWinCount(d.winCount);
        if(d.completed){const c={};Object.entries(d.completed).forEach(([k,v])=>{c[k]=new Set(v);});setCompleted(c);}
        if(d.notes)setNotes(d.notes);
        setLastSaved(data.updated_at);
        setPhase(rg.length>0?"pick-position":"home");
        if(rg.length>0)trackOnce("session_return",{positions_ranked:rg.length});
      }else{setPhase("home");}
      }catch(e){console.error('Failed to load board:',e);setPhase("home");}
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
      const boardData={ratings,traits,rankedGroups:[...rankedGroups],traitReviewedGroups:[...traitReviewedGroups],compCount,notes,completed:Object.fromEntries(Object.entries(completed).map(([k,v])=>[k,[...v]])),winCount};
      const{error}=await supabase.from('boards').upsert({user_id:user.id,board_data:boardData},{onConflict:'user_id'});
      if(!error){setLastSaved(new Date().toISOString());setSaveFailed(false);}else{setSaveFailed(true);}
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
  },[ratings,traits,rankedGroups,traitReviewedGroups,compCount,notes,user.id,phase]);

  const prospectsMap=useMemo(()=>{const m={};PROSPECTS.forEach(p=>m[p.id]=p);return m;},[]);
  const byPos=useMemo(()=>{const m={};PROSPECTS.forEach(p=>{const g=p.gpos||p.pos;const group=(g==="K"||g==="P"||g==="LS")?"K/P":g;if(!m[group])m[group]=[];m[group].push(p);});return m;},[]);
  const startRanking=useCallback((pos)=>{const ids=(byPos[pos]||[]).map(p=>p.id);
    track("ranking_started",{position:pos,prospects:ids.length});
    // Build consensus order map: id → consensus position rank (lower = better)
    const consOrder={};ids.forEach(id=>{const p=prospectsMap[id];if(p){const cr=getConsensusRank(p.name);consOrder[id]=cr<900?cr:999;}});
    const allM=generateMatchups(ids,consOrder);
    // Seed initial Elo from consensus: top consensus → higher starting Elo
    const r={...ratings};ids.forEach(id=>{if(!r[id]){const cr=consOrder[id]||999;r[id]=cr<900?1500+Math.max(0,(100-cr)*3):INITIAL_ELO;}});
    const c={...compCount};ids.forEach(id=>{if(!c[id])c[id]=0;});
    // Preserve completed matchups if resuming
    const existingDone=completed[pos]||new Set();
    setRatings(r);setCompCount(c);setCompleted(prev=>({...prev,[pos]:existingDone}));setMatchups(prev=>({...prev,[pos]:allM}));setCurrentMatchup(getNextMatchup(allM,existingDone,r));setActivePos(pos);setPhase("ranking");
  },[ratings,compCount,byPos,completed,prospectsMap,getConsensusRank]);
  const handlePick=useCallback((winnerId,confidence=0.5)=>{if(!currentMatchup||!activePos)return;const[a,b]=currentMatchup;const aWon=winnerId===a;const loserId=aWon?b:a;const k=24+(confidence*24);const{newA,newB}=eloUpdate(ratings[a]||1500,ratings[b]||1500,aWon,k);let winR=aWon?newA:newB;let loseR=aWon?newB:newA;if(winR<=loseR){const mid=(winR+loseR)/2;winR=mid+0.5;loseR=mid-0.5;}const ur={...ratings,[winnerId]:winR,[loserId]:loseR};setRatings(ur);const uc={...compCount,[a]:(compCount[a]||0)+1,[b]:(compCount[b]||0)+1};setCompCount(uc);setWinCount(prev=>({...prev,[winnerId]:(prev[winnerId]||0)+1}));const ns=new Set(completed[activePos]);ns.add(`${a}-${b}`);setCompleted(prev=>({...prev,[activePos]:ns}));const next=getNextMatchup(matchups[activePos],ns,ur);if(!next)finishRanking(activePos,ur);else setCurrentMatchup(next);setShowConfidence(false);setPendingWinner(null);},[currentMatchup,activePos,ratings,completed,matchups,compCount]);
  const canFinish=useMemo(()=>{if(!activePos||!byPos[activePos])return false;const done=(completed[activePos]||new Set()).size;return done>=8;},[activePos,byPos,completed]);

  // Keyboard shortcuts for ranking: ←/→ to pick player, 1-4 for confidence, Esc to cancel
  useEffect(()=>{
    if(phase!=="ranking"||!currentMatchup)return;
    const handler=(e)=>{
      // Don't capture if user is typing in an input
      if(e.target.tagName==="INPUT"||e.target.tagName==="TEXTAREA")return;
      if(showConfidence&&pendingWinner){
        const confMap={"1":0.2,"2":0.5,"3":0.75,"4":1};
        if(confMap[e.key]){e.preventDefault();handlePick(pendingWinner,confMap[e.key]);}
        if(e.key==="Escape"){setShowConfidence(false);setPendingWinner(null);}
      }else if(!showConfidence){
        const[aId,bId]=currentMatchup;
        if(e.key==="ArrowLeft"){e.preventDefault();setPendingWinner(aId);setShowConfidence(true);}
        if(e.key==="ArrowRight"){e.preventDefault();setPendingWinner(bId);setShowConfidence(true);}
      }
    };
    window.addEventListener("keydown",handler);
    return()=>window.removeEventListener("keydown",handler);
  },[phase,currentMatchup,showConfidence,pendingWinner,handlePick]);
  const finishRanking=useCallback((pos,r)=>{const rts=r||ratings;const sorted=[...(byPos[pos]||[])].sort((a,b)=>(rts[b.id]||1500)-(rts[a.id]||1500));const votedCount=(byPos[pos]||[]).filter(p=>(compCount[p.id]||0)>0).length;const doneCount=(completed[pos]||new Set()).size;track("ranking_saved",{position:pos,comparisons:doneCount,players_voted:votedCount,total_prospects:(byPos[pos]||[]).length});const nt={...traits};sorted.forEach((p,i)=>{if(!nt[p.id])nt[p.id]={};const base=Math.round(85-(i/Math.max(sorted.length-1,1))*50);(POSITION_TRAITS[p.gpos||p.pos]||POSITION_TRAITS[p.pos]||[]).forEach(t=>{nt[p.id][t]=Math.max(10,Math.min(99,base+Math.floor(Math.random()*16)-8));});});setTraits(nt);setRankedGroups(prev=>new Set([...prev,pos]));setPhase("pick-position");},[ratings,byPos,traits,compCount,completed]);
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
    const p=prospectsMap[id];if(!p)return 50;
    return getConsensusGrade(p.name);
  }const p=prospectsMap[id];const pos=p?(p.gpos||p.pos):"QB";const weights=TRAIT_WEIGHTS[pos]||TRAIT_WEIGHTS["QB"];const posTraits=POSITION_TRAITS[pos]||[];let totalW=0,totalV=0;posTraits.forEach(trait=>{const w=weights[trait]||1/posTraits.length;const v=t[trait]||50;totalW+=w;totalV+=v*w;});return totalW>0?Math.round(totalV/totalW):50;},[traits,prospectsMap]);
  const getBoard=useCallback(()=>PROSPECTS.filter(p=>{const g=p.gpos||p.pos;const group=(g==="K"||g==="P"||g==="LS")?"K/P":g;return rankedGroups.has(group);}).sort((a,b)=>{const d=getGrade(b.id)-getGrade(a.id);return d!==0?d:(ratings[b.id]||1500)-(ratings[a.id]||1500);}),[rankedGroups,getGrade,ratings]);

  // Build mock draft board: consensus order for all 319, user rankings override when graded
  const mockDraftBoard=useMemo(()=>{
    // Sort ALL prospects by consensus rank
    return [...PROSPECTS].sort((a,b)=>getConsensusRank(a.name)-getConsensusRank(b.name));
  },[]);

  const finishTraits=useCallback((pos)=>{setTraitReviewedGroups(prev=>new Set([...prev,pos]));const ranked=getRanked(pos);const byGrade=[...ranked].sort((a,b)=>getGrade(b.id)-getGrade(a.id));const conflicts=ranked.map((p,i)=>{const gi=byGrade.findIndex(x=>x.id===p.id);return Math.abs(i-gi)>=3?{player:p,pairRank:i+1,gradeRank:gi+1,grade:getGrade(p.id)}:null;}).filter(Boolean);if(conflicts.length){setReconcileQueue(conflicts);setReconcileIndex(0);setPhase("reconcile");}else setPhase("pick-position");},[getRanked,getGrade]);

  const SaveBar=()=>(<div style={{position:"fixed",top:0,left:0,right:0,zIndex:100,display:"flex",justifyContent:"space-between",alignItems:"center",padding:"6px 16px",background:"#fff",borderBottom:"1px solid #f0f0f0"}}><div style={{display:"flex",alignItems:"center",gap:12}}><img src="/logo.png" alt="BBL" style={{height:24,cursor:"pointer"}} onClick={()=>setPhase(rankedGroups.size>0?"pick-position":"home")}/><span style={{fontFamily:mono,fontSize:10,color:"#a3a3a3"}}>{user.email}</span></div><div style={{display:"flex",alignItems:"center",gap:8}}>{!showOnboarding&&<button onClick={()=>setShowOnboarding(true)} style={{fontFamily:sans,fontSize:10,color:"#a3a3a3",background:"none",border:"1px solid #e5e5e5",borderRadius:99,padding:"3px 8px",cursor:"pointer"}} title="How it works">?</button>}<span style={{fontFamily:mono,fontSize:10,color:saving?"#ca8a04":saveFailed?"#dc2626":"#d4d4d4"}}>{saving?"saving...":saveFailed?"save failed — retrying…":lastSaved?`saved ${new Date(lastSaved).toLocaleTimeString()}`:""}</span><button onClick={onSignOut} style={{fontFamily:sans,fontSize:10,color:"#a3a3a3",background:"none",border:"1px solid #e5e5e5",borderRadius:99,padding:"3px 10px",cursor:"pointer"}}>sign out</button></div></div>);

  if(phase==="loading")return(<div style={{minHeight:"100vh",background:"#faf9f6",display:"flex",alignItems:"center",justifyContent:"center"}}><p style={{fontFamily:sans,fontSize:14,color:"#a3a3a3"}}>loading your board...</p></div>);

  // === MOCK DRAFT (check before phase returns to fix click bug) ===
  if(showMockDraft){const myBoard=[...PROSPECTS].sort((a,b)=>{const gA=(a.gpos==="K"||a.gpos==="P"||a.gpos==="LS")?"K/P":(a.gpos||a.pos);const gB=(b.gpos==="K"||b.gpos==="P"||b.gpos==="LS")?"K/P":(b.gpos||b.pos);const aRanked=rankedGroups.has(gA);const bRanked=rankedGroups.has(gB);if(aRanked&&!bRanked)return-1;if(!aRanked&&bRanked)return 1;if(aRanked&&bRanked){const d=getGrade(b.id)-getGrade(a.id);return d!==0?d:(ratings[b.id]||1500)-(ratings[a.id]||1500);}return getConsensusRank(a.name)-getConsensusRank(b.name);});return<MockDraftSim board={mockDraftBoard} myBoard={myBoard} getGrade={getGrade} teamNeeds={TEAM_NEEDS} draftOrder={DRAFT_ORDER} onClose={()=>setShowMockDraft(false)} allProspects={PROSPECTS} PROSPECTS={PROSPECTS} CONSENSUS={CONSENSUS} ratings={ratings} traits={traits} setTraits={setTraits} notes={notes} setNotes={setNotes} POS_COLORS={POS_COLORS} POSITION_TRAITS={POSITION_TRAITS} SchoolLogo={SchoolLogo} NFLTeamLogo={NFLTeamLogo} RadarChart={RadarChart} PlayerProfile={PlayerProfile} font={font} mono={mono} sans={sans} schoolLogo={schoolLogo} getConsensusRank={getConsensusRank} getConsensusGrade={getConsensusGrade} TEAM_NEEDS_DETAILED={TEAM_NEEDS_DETAILED} rankedGroups={rankedGroups}/>;}

  // === HOME ===
  if(phase==="home"||phase==="pick-position"){
    const hasBoardData=rankedGroups.size>0;
    const hasStaleData=!hasBoardData&&Object.keys(ratings).length>0&&!sessionStorage.getItem('bbl_stale_dismissed');
    const dismissStale=()=>{sessionStorage.setItem('bbl_stale_dismissed','1');setRatings({});setTraits({});setCompCount({});setWinCount({});};
    const dismissOnboarding=()=>{setShowOnboarding(false);try{localStorage.setItem('bbl_onboarded','1');}catch(e){}};
    return(<div style={{minHeight:"100vh",background:"#faf9f6",fontFamily:font}}><SaveBar/><div style={{maxWidth:720,margin:"0 auto",padding:"52px 24px 60px"}}>

    {hasBoardData&&<div style={{marginBottom:32}}>
      <h1 style={{fontSize:36,fontWeight:900,color:"#171717",margin:"0 0 20px",letterSpacing:-1}}>big board lab</h1>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:24}}>
        <button onClick={()=>setPhase("board")} style={{background:"#fff",border:"1px solid #e5e5e5",borderRadius:12,padding:"20px",textAlign:"left",cursor:"pointer"}}>
          <div style={{fontFamily:font,fontSize:22,fontWeight:900,color:"#171717",marginBottom:4}}>📋 big board</div>
          <div style={{fontFamily:sans,fontSize:13,color:"#a3a3a3"}}>{getBoard().length} prospects ranked</div>
        </button>
        <button onClick={()=>setShowMockDraft(true)} style={{background:"#fff",border:"1px solid #e5e5e5",borderRadius:12,padding:"20px",textAlign:"left",cursor:"pointer"}}>
          <div style={{fontFamily:font,fontSize:22,fontWeight:900,color:"#171717",marginBottom:4}}>🏈 mock draft</div>
          <div style={{fontFamily:sans,fontSize:13,color:"#a3a3a3"}}>sim the draft with your board</div>
        </button>
      </div>
    </div>}

    {!hasBoardData&&<div style={{textAlign:"center",marginBottom:32}}>
      <img src="/logo.png" alt="Big Board Lab" style={{width:80,height:"auto",marginBottom:12}}/>
      <p style={{fontFamily:mono,fontSize:11,letterSpacing:3,color:"#a3a3a3",textTransform:"uppercase",margin:"0 0 12px"}}>2026 NFL Draft · Pittsburgh · April 23–25</p>
      <h1 style={{fontSize:"clamp(36px,7vw,56px)",fontWeight:900,lineHeight:1,color:"#171717",margin:"0 0 16px",letterSpacing:-2}}>big board lab</h1>
      <div style={{display:"flex",gap:12,justifyContent:"center",marginTop:20}}>
        <button onClick={()=>setShowMockDraft(true)} style={{fontFamily:sans,fontSize:14,fontWeight:700,padding:"12px 24px",background:"#fff",color:"#171717",border:"1px solid #e5e5e5",borderRadius:99,cursor:"pointer"}}>🏈 mock draft</button>
        <button onClick={()=>{const firstPos=POSITION_GROUPS[0];startRanking(firstPos);}} style={{fontFamily:sans,fontSize:14,fontWeight:700,padding:"12px 24px",background:"#171717",color:"#faf9f6",border:"none",borderRadius:99,cursor:"pointer"}}>⚖️ start ranking</button>
      </div>
    </div>}

    {/* Dismissible onboarding */}
    {showOnboarding&&<div style={{background:"#fff",border:"1px solid #e5e5e5",borderRadius:16,padding:"20px 24px",marginBottom:24,position:"relative"}}>
      <button onClick={dismissOnboarding} style={{position:"absolute",top:12,right:14,fontFamily:sans,fontSize:11,color:"#a3a3a3",background:"none",border:"1px solid #e5e5e5",borderRadius:99,padding:"2px 8px",cursor:"pointer"}}>✕</button>
      <h3 style={{fontFamily:font,fontSize:16,fontWeight:900,color:"#171717",margin:"0 0 14px"}}>how it works</h3>
      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        <div style={{display:"flex",gap:12,alignItems:"flex-start"}}>
          <span style={{fontFamily:font,fontSize:20,fontWeight:900,color:"#d4d4d4",lineHeight:1,flexShrink:0,width:24}}>1</span>
          <div><span style={{fontFamily:sans,fontSize:13,fontWeight:700,color:"#171717"}}>pair rank prospects</span><span style={{fontFamily:sans,fontSize:13,color:"#737373"}}> — pick A or B to build your top 10-15 per position. save anytime, refine later.</span></div>
        </div>
        <div style={{display:"flex",gap:12,alignItems:"flex-start"}}>
          <span style={{fontFamily:font,fontSize:20,fontWeight:900,color:"#d4d4d4",lineHeight:1,flexShrink:0,width:24}}>2</span>
          <div><span style={{fontFamily:sans,fontSize:13,fontWeight:700,color:"#171717"}}>fine-tune traits</span><span style={{fontFamily:sans,fontSize:13,color:"#737373"}}> — adjust sliders to change overall grades. add scouting notes.</span></div>
        </div>
        <div style={{display:"flex",gap:12,alignItems:"flex-start"}}>
          <span style={{fontFamily:font,fontSize:20,fontWeight:900,color:"#d4d4d4",lineHeight:1,flexShrink:0,width:24}}>3</span>
          <div><span style={{fontFamily:sans,fontSize:13,fontWeight:700,color:"#171717"}}>mock draft</span><span style={{fontFamily:sans,fontSize:13,color:"#737373"}}> — draft as any team with your board or consensus. trade up, fill needs.</span></div>
        </div>
      </div>
    </div>}

    {/* Stale data warning */}
    {hasStaleData&&<div style={{background:"#fef3c7",border:"1px solid #fcd34d",borderRadius:12,padding:"12px 16px",marginBottom:20,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
      <span style={{fontFamily:sans,fontSize:13,color:"#92400e"}}>You have rankings from an old session. Reset to start fresh with the new position groups.</span>
      <button onClick={dismissStale} style={{fontFamily:sans,fontSize:11,fontWeight:700,padding:"6px 14px",background:"#171717",color:"#faf9f6",border:"none",borderRadius:99,cursor:"pointer",flexShrink:0,marginLeft:12}}>reset</button>
    </div>}

    <h2 style={{fontFamily:font,fontSize:hasBoardData?20:24,fontWeight:900,color:"#171717",margin:"0 0 4px",letterSpacing:-1}}>{hasBoardData?"edit positions":"positions"}</h2>
    <p style={{fontFamily:sans,fontSize:14,color:"#a3a3a3",margin:"0 0 20px"}}>rank each group, then tune traits to build your board</p>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill, minmax(200px, 1fr))",gap:12}}>{POSITION_GROUPS.map(pos=>{const ct=(byPos[pos]||[]).length;const done=rankedGroups.has(pos);const reviewed=traitReviewedGroups.has(pos);const c=POS_COLORS[pos];const doneCount=(completed[pos]||new Set()).size;const votedCount=done?(byPos[pos]||[]).filter(p=>(compCount[p.id]||0)>0).length:0;return(<div key={pos} style={{background:"#fff",border:"1px solid #e5e5e5",borderRadius:12,padding:"18px 20px",position:"relative"}}>{done&&<span style={{position:"absolute",top:12,right:14,fontSize:10,fontFamily:mono,color:"#22c55e"}}>{votedCount}/{ct} ranked</span>}<div style={{fontFamily:font,fontSize:28,fontWeight:900,color:c,marginBottom:2}}>{pos}</div><div style={{fontFamily:mono,fontSize:11,color:"#a3a3a3",marginBottom:14}}>{ct} prospects{doneCount>0&&!done?` · ${doneCount} compared`:""}</div><div style={{display:"flex",gap:8,flexWrap:"wrap"}}>{!done?<button onClick={()=>startRanking(pos)} style={{fontFamily:sans,fontSize:12,fontWeight:700,padding:"7px 18px",background:"#171717",color:"#faf9f6",border:"none",borderRadius:99,cursor:"pointer"}}>{doneCount>0?"resume":"rank"}</button>:<><button onClick={()=>{setActivePos(pos);setSelectedPlayer(getRanked(pos)[0]);setPhase("traits");}} style={{fontFamily:sans,fontSize:12,fontWeight:700,padding:"7px 18px",background:reviewed?`${c}11`:"#171717",color:reviewed?c:"#faf9f6",border:reviewed?`1px solid ${c}33`:"none",borderRadius:99,cursor:"pointer"}}>{reviewed?"✓ rankings":"rankings"}</button><button onClick={()=>startRanking(pos)} style={{fontFamily:sans,fontSize:11,padding:"7px 14px",background:"transparent",color:"#a3a3a3",border:"1px solid #e5e5e5",borderRadius:99,cursor:"pointer"}}>refine</button></>}</div></div>);})}</div>
    {rankedGroups.size>0&&<div style={{textAlign:"center",marginTop:32}}><button onClick={()=>setPhase("board")} style={{fontFamily:sans,fontSize:14,fontWeight:700,padding:"14px 36px",background:"#171717",color:"#faf9f6",border:"none",borderRadius:99,cursor:"pointer"}}>view big board ({rankedGroups.size}/{POSITION_GROUPS.length})</button></div>}

    {rankedGroups.size>0&&<div style={{textAlign:"center",marginTop:20}}><button onClick={()=>{if(window.confirm("Reset all rankings, traits, and notes? This cannot be undone.")){setRatings({});setTraits({});setNotes({});setRankedGroups(new Set());setTraitReviewedGroups(new Set());setCompCount({});setWinCount({});setCompleted({});setPhase("home");}}} style={{fontFamily:sans,fontSize:11,padding:"7px 18px",background:"transparent",color:"#dc2626",border:"1px solid #fecaca",borderRadius:99,cursor:"pointer"}}>reset all rankings</button></div>}

    </div></div>);
  }

  // === RANKING ===
  if(phase==="ranking"&&currentMatchup&&activePos){const[aId,bId]=currentMatchup;const pA=prospectsMap[aId],pB=prospectsMap[bId];const c=POS_COLORS[activePos];const totalM=(matchups[activePos]||[]).length;const doneM=(completed[activePos]||new Set()).size;const ranked=getRanked(activePos);const votedIds=new Set();Object.keys(compCount).forEach(id=>{if((compCount[id]||0)>0&&(byPos[activePos]||[]).some(p=>p.id===id))votedIds.add(id);});const votedRanked=ranked.filter(p=>votedIds.has(p.id));const unvotedRanked=ranked.filter(p=>!votedIds.has(p.id));return(<div style={{minHeight:"100vh",background:"#faf9f6",fontFamily:font}}><SaveBar/><div style={{maxWidth:720,margin:"0 auto",padding:"52px 24px 40px"}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}><h1 style={{fontSize:28,fontWeight:900,color:c,margin:0}}>rank {activePos}s</h1>{canFinish&&<button onClick={()=>finishRanking(activePos,ratings)} style={{fontFamily:sans,fontSize:12,fontWeight:700,padding:"8px 20px",background:"#22c55e",color:"#fff",border:"none",borderRadius:99,cursor:"pointer"}}>{"✓ save"+(votedRanked.length>0?" top "+votedRanked.length:"")+" & continue"}</button>}</div><p style={{fontFamily:sans,fontSize:13,color:"#a3a3a3",margin:"0 0 8px"}}>who's the better prospect? · <span style={{color:c}}>{doneM} compared</span>{canFinish&&<span> · save anytime, refine later</span>}</p><div style={{height:3,background:"#e5e5e5",borderRadius:2,marginBottom:28,overflow:"hidden"}}><div style={{height:"100%",width:`${Math.min(100,(doneM/Math.max(totalM,1))*100)}%`,background:c,transition:"width 0.3s",borderRadius:2}}/></div><div style={{display:"flex",gap:12,marginBottom:24,alignItems:"stretch",position:"relative"}}><div style={{position:"absolute",left:"50%",top:"50%",transform:"translate(-50%,-50%)",zIndex:2,fontFamily:font,fontSize:16,fontWeight:900,color:"#d4d4d4",background:"#faf9f6",padding:"4px 10px",borderRadius:99,border:"1px solid #e5e5e5"}}>vs</div>{[{p:pA,id:aId},{p:pB,id:bId}].map(({p,id})=>{const ps=getProspectStats(p.name,p.school);return<button key={id} onClick={()=>{if(showConfidence)return;setPendingWinner(id);setShowConfidence(true);}} style={{flex:1,padding:"24px 16px 20px",background:pendingWinner===id?`${c}08`:"#fff",border:pendingWinner===id?`2px solid ${c}`:"1px solid #e5e5e5",borderRadius:16,cursor:showConfidence?"default":"pointer",textAlign:"center",transition:"all 0.15s",display:"flex",flexDirection:"column",alignItems:"center",gap:4}} onMouseEnter={e=>{if(!showConfidence)e.currentTarget.style.borderColor=c;}} onMouseLeave={e=>{if(!showConfidence&&pendingWinner!==id)e.currentTarget.style.borderColor="#e5e5e5";}}><SchoolLogo school={p.school} size={44}/><div style={{fontFamily:font,fontSize:20,fontWeight:900,color:"#171717",lineHeight:1.1,marginTop:2}}>{p.name}</div><div style={{fontFamily:mono,fontSize:11,color:"#a3a3a3"}}>{p.school}</div><div style={{display:"flex",gap:6,alignItems:"center",marginTop:2}}><span style={{fontFamily:mono,fontSize:10,fontWeight:500,color:c,background:`${c}0d`,padding:"3px 10px",borderRadius:4,border:`1px solid ${c}1a`}}>{p.gpos||p.pos}</span>{ps&&<span style={{fontFamily:mono,fontSize:10,color:"#a3a3a3"}}>{ps.rank?"#"+ps.rank+" ovr":"NR"}{ps.posRank?" · "+(p.gpos||p.pos)+ps.posRank:""}</span>}</div>{ps&&(ps.height||ps.weight)&&<div style={{fontFamily:mono,fontSize:10,color:"#a3a3a3",marginTop:2}}>{[ps.height,ps.weight?ps.weight+"lbs":"",ps.cls?("yr "+ps.cls):""].filter(Boolean).join(" · ")}</div>}{ps&&ps.statLine&&<div style={{fontFamily:mono,fontSize:10,color:"#525252",marginTop:4,lineHeight:1.3,background:"#f9f9f6",padding:"4px 8px",borderRadius:6,border:"1px solid #f0f0f0",maxWidth:"100%"}}>{ps.statLine}{ps.statExtra&&<><br/><span style={{color:"#a3a3a3"}}>{ps.statExtra}</span></>}</div>}{(compCount[id]||0)>=2&&<div style={{fontFamily:mono,fontSize:9,color:"#a3a3a3",marginTop:4}}>{Math.round(((winCount[id]||0)/(compCount[id]))*100)}% pick rate</div>}</button>})}</div>{showConfidence&&<div style={{background:"#fff",border:"1px solid #e5e5e5",borderRadius:12,padding:"20px 24px",marginBottom:24,textAlign:"center"}}><p style={{fontFamily:sans,fontSize:13,fontWeight:700,color:"#171717",margin:"0 0 4px"}}>how confident?</p><p style={{fontFamily:sans,fontSize:12,color:"#a3a3a3",margin:"0 0 16px"}}>higher = bigger rating swing</p><div style={{display:"flex",gap:8,justifyContent:"center",flexWrap:"wrap"}}>{[["coin flip",.2],["leaning",.5],["confident",.75],["lock",1]].map(([label,val])=><button key={label} onClick={()=>handlePick(pendingWinner,val)} style={{fontFamily:sans,fontSize:12,fontWeight:600,padding:"8px 16px",background:val>=.75?"#171717":"transparent",color:val>=.75?"#faf9f6":"#525252",border:"1px solid #e5e5e5",borderRadius:99,cursor:"pointer"}} onMouseEnter={e=>{e.currentTarget.style.background="#171717";e.currentTarget.style.color="#faf9f6";}} onMouseLeave={e=>{if(val<.75){e.currentTarget.style.background="transparent";e.currentTarget.style.color="#525252";}}}>{label}</button>)}</div><button onClick={()=>{setShowConfidence(false);setPendingWinner(null);}} style={{fontFamily:sans,fontSize:11,color:"#a3a3a3",background:"none",border:"none",cursor:"pointer",marginTop:10}}>← pick again</button></div>}<div style={{background:"#fff",border:"1px solid #e5e5e5",borderRadius:12,padding:"16px 20px",marginBottom:16}}><p style={{fontFamily:mono,fontSize:10,letterSpacing:2,color:"#a3a3a3",textTransform:"uppercase",margin:"0 0 10px"}}>your board{votedRanked.length>0&&<span style={{color:c}}> · {votedRanked.length} ranked</span>}</p>{votedRanked.length===0&&<p style={{fontFamily:sans,fontSize:12,color:"#d4d4d4",margin:"4px 0"}}>players will appear here as you vote</p>}<div style={{maxHeight:400,overflowY:"auto"}}>{votedRanked.map((p,i)=><div key={p.id} style={{display:"flex",alignItems:"center",gap:10,padding:"5px 0",borderBottom:i<votedRanked.length-1?"1px solid #f5f5f5":"none"}}><span style={{fontFamily:mono,fontSize:11,color:"#d4d4d4",width:20,textAlign:"right"}}>{i+1}</span><SchoolLogo school={p.school} size={20}/><span style={{fontFamily:sans,fontSize:13,fontWeight:600,color:"#171717",flex:1,cursor:"pointer",textDecoration:"none"}} onClick={e=>{e.stopPropagation();setProfilePlayer(p);}} onMouseEnter={e=>e.currentTarget.style.textDecoration="underline"} onMouseLeave={e=>e.currentTarget.style.textDecoration="none"}>{p.name}</span><span style={{fontFamily:mono,fontSize:11,color:"#a3a3a3"}}>{Math.round(ratings[p.id]||1500)}</span></div>)}{unvotedRanked.length>0&&<div style={{marginTop:8,paddingTop:8,borderTop:"1px dashed #e5e5e5"}}><p style={{fontFamily:mono,fontSize:9,color:"#d4d4d4",letterSpacing:1,margin:"0 0 4px"}}>CONSENSUS DEFAULTS · {unvotedRanked.length} unranked</p></div>}</div></div><button onClick={()=>setPhase("pick-position")} style={{fontFamily:sans,fontSize:12,color:"#a3a3a3",background:"none",border:"1px solid #e5e5e5",borderRadius:99,padding:"8px 20px",cursor:"pointer"}}>← back</button></div>{profilePlayer&&<PlayerProfile player={profilePlayer} traits={traits} setTraits={setTraits} notes={notes} setNotes={setNotes} allProspects={PROSPECTS} getGrade={getGrade} onClose={()=>setProfilePlayer(null)} onSelectPlayer={setProfilePlayer} consensus={CONSENSUS} ratings={ratings}/>}</div>);}

  // === TRAITS ===
  if(phase==="traits"&&activePos){const ranked=getRanked(activePos);const posTraits=POSITION_TRAITS[activePos]||[];const c=POS_COLORS[activePos];const cur=selectedPlayer||ranked[0];const curIdx=ranked.findIndex(p=>p.id===cur?.id);return(<div style={{minHeight:"100vh",background:"#faf9f6",fontFamily:font}}><SaveBar/><div style={{maxWidth:900,margin:"0 auto",padding:"52px 24px 40px"}}><h1 style={{fontSize:28,fontWeight:900,color:c,margin:"0 0 4px"}}>{activePos} rankings</h1><p style={{fontFamily:sans,fontSize:13,color:"#a3a3a3",margin:"0 0 24px"}}>drag to reorder · click name for full profile</p><div style={{display:"flex",gap:16}}><DraggableRankList ranked={ranked} activePos={activePos} cur={cur} c={c} getGrade={getGrade} setSelectedPlayer={setSelectedPlayer} movePlayer={movePlayer} setProfilePlayer={setProfilePlayer} font={font} mono={mono} sans={sans}/>{cur&&<div style={{flex:1,background:"#fff",border:"1px solid #e5e5e5",borderRadius:12,padding:24}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20,paddingBottom:16,borderBottom:"1px solid #f5f5f5"}}><div style={{display:"flex",alignItems:"center",gap:14}}><SchoolLogo school={cur.school} size={44}/><div><div style={{fontFamily:font,fontSize:24,fontWeight:900,color:"#171717",cursor:"pointer"}} onClick={()=>setProfilePlayer(cur)} onMouseEnter={e=>e.currentTarget.style.textDecoration="underline"} onMouseLeave={e=>e.currentTarget.style.textDecoration="none"}>{cur.name}</div><div style={{fontFamily:mono,fontSize:12,color:"#a3a3a3"}}>{cur.school}</div></div></div><div style={{textAlign:"right"}}><div style={{fontFamily:font,fontSize:36,fontWeight:900,color:getGrade(cur.id)>=75?"#16a34a":getGrade(cur.id)>=55?"#ca8a04":"#dc2626",lineHeight:1}}>{getGrade(cur.id)}</div><div style={{fontFamily:mono,fontSize:9,letterSpacing:2,color:"#a3a3a3",textTransform:"uppercase"}}>grade</div></div></div><div style={{display:"flex",justifyContent:"center",marginBottom:16}}><RadarChart traits={posTraits} values={posTraits.map(t=>traits[cur.id]?.[t]||50)} color={c} size={220}/></div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"8px 16px"}}>{posTraits.map(trait=>{const val=traits[cur.id]?.[trait]||50;return<div key={trait} style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><span style={{fontFamily:mono,fontSize:11,color:"#737373"}}>{TRAIT_EMOJI[trait]||""} {trait}</span><span style={{fontFamily:font,fontSize:14,fontWeight:900,color:`rgb(${Math.round(236+(124-236)*(val/100))},${Math.round(72+(58-72)*(val/100))},${Math.round(153+(237-153)*(val/100))})`}}>{val}</span></div>;})}</div>{notes[cur.id]&&<div style={{marginTop:16,padding:"10px 12px",background:"#faf9f6",borderRadius:8,border:"1px solid #f0f0f0"}}><div style={{fontFamily:mono,fontSize:9,color:"#a3a3a3",letterSpacing:1,textTransform:"uppercase",marginBottom:4}}>notes</div><div style={{fontFamily:sans,fontSize:12,color:"#525252",lineHeight:1.5}}>{notes[cur.id]}</div></div>}<div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:20,paddingTop:16,borderTop:"1px solid #f5f5f5"}}><button onClick={()=>curIdx>0&&setSelectedPlayer(ranked[curIdx-1])} disabled={curIdx<=0} style={{fontFamily:sans,fontSize:12,padding:"7px 16px",background:"transparent",border:"1px solid #e5e5e5",borderRadius:99,cursor:curIdx>0?"pointer":"default",color:curIdx>0?"#525252":"#d4d4d4"}}>← prev</button><span style={{fontFamily:mono,fontSize:11,color:"#a3a3a3"}}>{curIdx+1} / {ranked.length}</span><button onClick={()=>curIdx<ranked.length-1&&setSelectedPlayer(ranked[curIdx+1])} disabled={curIdx>=ranked.length-1} style={{fontFamily:sans,fontSize:12,padding:"7px 16px",background:"transparent",border:"1px solid #e5e5e5",borderRadius:99,cursor:curIdx<ranked.length-1?"pointer":"default",color:curIdx<ranked.length-1?"#525252":"#d4d4d4"}}>next →</button></div></div>}</div><div style={{display:"flex",gap:10,marginTop:20,justifyContent:"center"}}><button onClick={()=>setPhase("pick-position")} style={{fontFamily:sans,fontSize:12,padding:"8px 20px",background:"transparent",border:"1px solid #e5e5e5",borderRadius:99,cursor:"pointer",color:"#a3a3a3"}}>← back</button><button onClick={()=>finishTraits(activePos)} style={{fontFamily:sans,fontSize:13,fontWeight:700,padding:"10px 28px",background:"#171717",color:"#faf9f6",border:"none",borderRadius:99,cursor:"pointer"}}>save rankings →</button></div></div>{profilePlayer&&<PlayerProfile player={profilePlayer} traits={traits} setTraits={setTraits} notes={notes} setNotes={setNotes} allProspects={PROSPECTS} getGrade={getGrade} onClose={()=>setProfilePlayer(null)} onSelectPlayer={setProfilePlayer} consensus={CONSENSUS} ratings={ratings}/>}</div>);}

  // === RECONCILE ===
  if(phase==="reconcile"&&reconcileQueue.length>0){const item=reconcileQueue[Math.min(reconcileIndex,reconcileQueue.length-1)];const c=POS_COLORS[item.player.pos];const dir=item.gradeRank<item.pairRank?"higher":"lower";return(<div style={{minHeight:"100vh",background:"#faf9f6",fontFamily:font}}><SaveBar/><div style={{maxWidth:500,margin:"0 auto",padding:"52px 24px"}}><p style={{fontFamily:mono,fontSize:10,letterSpacing:2,color:"#a3a3a3",textTransform:"uppercase",margin:"0 0 4px"}}>reconcile · {reconcileIndex+1} of {reconcileQueue.length}</p><div style={{height:3,background:"#e5e5e5",borderRadius:2,marginBottom:28,overflow:"hidden"}}><div style={{height:"100%",width:`${((reconcileIndex+1)/reconcileQueue.length)*100}%`,background:c,borderRadius:2}}/></div><div style={{background:"#fff",border:"1px solid #e5e5e5",borderRadius:16,padding:32,textAlign:"center"}}><SchoolLogo school={item.player.school} size={56}/><div style={{fontFamily:font,fontSize:28,fontWeight:900,color:c,marginBottom:4,marginTop:8}}>{item.player.name}</div><div style={{fontFamily:mono,fontSize:12,color:"#a3a3a3",marginBottom:24}}>{item.player.school}</div><div style={{display:"flex",justifyContent:"center",gap:32,marginBottom:24}}>{[["gut rank",`#${item.pairRank}`,"#171717"],["grade rank",`#${item.gradeRank}`,dir==="higher"?"#16a34a":"#dc2626"],["composite",`${item.grade}`,"#171717"]].map(([label,val,col])=><div key={label}><div style={{fontFamily:mono,fontSize:9,letterSpacing:1.5,color:"#a3a3a3",textTransform:"uppercase",marginBottom:4}}>{label}</div><div style={{fontFamily:font,fontSize:28,fontWeight:900,color:col}}>{val}</div></div>)}</div><p style={{fontFamily:sans,fontSize:14,color:"#737373",lineHeight:1.5,marginBottom:24}}>your traits suggest this player should rank <strong style={{color:dir==="higher"?"#16a34a":"#dc2626"}}>{dir}</strong> than your gut. accept?</p><div style={{display:"flex",gap:10,justifyContent:"center"}}><button onClick={()=>{const pos=item.player.pos;const rk=getRanked(pos);const ti=item.gradeRank-1;const tp=rk[ti];if(tp)setRatings(prev=>({...prev,[item.player.id]:(prev[tp.id]||1500)+(dir==="higher"?1:-1)}));reconcileIndex>=reconcileQueue.length-1?setPhase("pick-position"):setReconcileIndex(reconcileIndex+1);}} style={{fontFamily:sans,fontSize:13,fontWeight:700,padding:"10px 24px",background:"#171717",color:"#faf9f6",border:"none",borderRadius:99,cursor:"pointer"}}>accept</button><button onClick={()=>reconcileIndex>=reconcileQueue.length-1?setPhase("pick-position"):setReconcileIndex(reconcileIndex+1)} style={{fontFamily:sans,fontSize:13,padding:"10px 24px",background:"transparent",color:"#737373",border:"1px solid #e5e5e5",borderRadius:99,cursor:"pointer"}}>keep my rank</button></div></div></div></div>);}

  // === BIG BOARD ===
  if(phase==="board")return(<div><SaveBar/><div style={{paddingTop:32}}><BoardView getBoard={getBoard} getGrade={getGrade} rankedGroups={rankedGroups} setPhase={setPhase} setSelectedPlayer={setSelectedPlayer} setActivePos={setActivePos} traits={traits} compareList={compareList} setCompareList={setCompareList} setProfilePlayer={setProfilePlayer} setShowMockDraft={setShowMockDraft} communityBoard={communityBoard} setCommunityBoard={setCommunityBoard} ratings={ratings}/></div>{profilePlayer&&<PlayerProfile player={profilePlayer} traits={traits} setTraits={setTraits} notes={notes} setNotes={setNotes} allProspects={PROSPECTS} getGrade={getGrade} onClose={()=>setProfilePlayer(null)} onSelectPlayer={setProfilePlayer} consensus={CONSENSUS} ratings={ratings}/>}</div>);

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
    <div style={{width:260,flexShrink:0,background:"#fff",border:"1px solid #e5e5e5",borderRadius:12,overflow:"hidden"}}>
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

function BoardView({getBoard,getGrade,rankedGroups,setPhase,setSelectedPlayer,setActivePos,traits,compareList,setCompareList,setProfilePlayer,setShowMockDraft,communityBoard,setCommunityBoard,ratings}){
  const[filterPos,setFilterPos]=useState(null);const[showCommunity,setShowCommunity]=useState(false);const board=getBoard();const display=filterPos?board.filter(p=>(p.gpos||p.pos)===filterPos):board;
  const compPlayers=compareList.map(id=>board.find(p=>p.id===id)).filter(Boolean);
  const samePos=compPlayers.length>=2&&compPlayers.every(p=>p.pos===compPlayers[0].pos);
  const compColors=["#2563eb","#dc2626","#16a34a","#f59e0b"];
  const[showCompareTip,setShowCompareTip]=useState(()=>{try{return!localStorage.getItem('bbl_compare_tip_seen');}catch(e){return true;}});
  const dismissCompareTip=()=>{setShowCompareTip(false);try{localStorage.setItem('bbl_compare_tip_seen','1');}catch(e){}};

  // Share top 10 as X-optimized image (1200x675)
  const shareTop10=useCallback(()=>{
    const W=1200,H=675;
    const canvas=document.createElement('canvas');canvas.width=W;canvas.height=H;
    const ctx=canvas.getContext('2d');
    // Dark gradient background
    const grad=ctx.createLinearGradient(0,0,W,H);
    grad.addColorStop(0,'#0a0a0a');grad.addColorStop(1,'#1a1a2e');
    ctx.fillStyle=grad;ctx.fillRect(0,0,W,H);
    // Subtle grid pattern
    ctx.strokeStyle='rgba(255,255,255,0.03)';ctx.lineWidth=1;
    for(let x=0;x<W;x+=40){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke();}
    for(let y=0;y<H;y+=40){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}
    // Accent line at top
    const acGrad=ctx.createLinearGradient(0,0,W,0);
    acGrad.addColorStop(0,'#ec4899');acGrad.addColorStop(1,'#7c3aed');
    ctx.fillStyle=acGrad;ctx.fillRect(0,0,W,4);
    // Title
    ctx.fillStyle='#fafafa';ctx.font='bold 36px Georgia,serif';ctx.fillText('MY BIG BOARD',48,56);
    ctx.fillStyle='rgba(255,255,255,0.3)';ctx.font='500 12px monospace';ctx.fillText('BIGBOARDLAB.COM  ·  2026 NFL DRAFT  ·  TOP 10',48,78);
    // Separator
    const dg=ctx.createLinearGradient(48,0,W-48,0);dg.addColorStop(0,'#ec4899');dg.addColorStop(1,'#7c3aed');
    ctx.fillStyle=dg;ctx.fillRect(48,92,W-96,2);
    // Players
    const top10=board.slice(0,10);
    top10.forEach((p,i)=>{
      const y=112+i*54;const grade=getGrade(p.id);const c=POS_COLORS[p.gpos||p.pos]||POS_COLORS[p.pos];
      // Row bg
      ctx.fillStyle=i%2===0?'rgba(255,255,255,0.02)':'transparent';
      ctx.fillRect(40,y,W-80,50);
      // Rank number
      ctx.fillStyle='rgba(255,255,255,0.15)';ctx.font='bold 18px Georgia,serif';
      ctx.fillText(`${i+1}`.padStart(2,'0'),56,y+32);
      // Position badge
      ctx.fillStyle=c;ctx.font='bold 11px monospace';
      const posW=ctx.measureText(p.pos).width+16;
      ctx.globalAlpha=0.15;ctx.fillRect(100,y+14,posW,24);ctx.globalAlpha=1;
      ctx.fillStyle=c;ctx.fillText(p.pos,108,y+31);
      // Name
      ctx.fillStyle='#fafafa';ctx.font='bold 20px sans-serif';
      ctx.fillText(p.name,100+posW+16,y+30);
      // School
      const nameW=ctx.measureText(p.name).width;
      ctx.fillStyle='rgba(255,255,255,0.3)';ctx.font='12px monospace';
      ctx.fillText(p.school,100+posW+16+nameW+12,y+30);
      // Grade
      const gColor=grade>=75?'#22c55e':grade>=55?'#eab308':'#ef4444';
      ctx.fillStyle=gColor;ctx.font='bold 28px Georgia,serif';
      ctx.textAlign='right';ctx.fillText(`${grade}`,W-56,y+34);ctx.textAlign='left';
      // Grade bar
      ctx.fillStyle='rgba(255,255,255,0.05)';ctx.fillRect(W-160,y+38,96,3);
      ctx.fillStyle=gColor;ctx.globalAlpha=0.6;ctx.fillRect(W-160,y+38,96*(grade/100),3);ctx.globalAlpha=1;
    });
    // Footer - branded bar
    const footGrad=ctx.createLinearGradient(0,0,W,0);footGrad.addColorStop(0,'#ec4899');footGrad.addColorStop(1,'#7c3aed');
    ctx.fillStyle=footGrad;ctx.fillRect(0,H-36,W,36);
    ctx.fillStyle='#fafafa';ctx.font='bold 14px Georgia,serif';ctx.fillText('big board lab',16,H-12);
    ctx.fillStyle='rgba(255,255,255,0.7)';ctx.font='11px monospace';
    ctx.textAlign='right';ctx.fillText(`${new Date().toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}).toUpperCase()}  ·  BUILD YOURS → BIGBOARDLAB.COM`,W-16,H-12);ctx.textAlign='left';
    canvas.toBlob(blob=>{
      if(navigator.share&&navigator.canShare?.({files:[new File([blob],'big-board.png',{type:'image/png'})]})){
        navigator.share({files:[new File([blob],'my-big-board-top10.png',{type:'image/png'})],title:'My Big Board — Big Board Lab',text:'My 2026 NFL Draft Big Board! Build yours at bigboardlab.com'});
      }else{
        const url=URL.createObjectURL(blob);const a=document.createElement('a');
        a.href=url;a.download='my-big-board-top10.png';a.click();URL.revokeObjectURL(url);
      }
    });
  },[board,getGrade]);

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

  return(<div style={{minHeight:"100vh",background:"#faf9f6",fontFamily:font}}><div style={{maxWidth:800,margin:"0 auto",padding:"40px 24px"}}>

    {/* === COMMUNITY BOARD MODE === */}
    {showCommunity&&communityBoard?<>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
        <h1 style={{fontSize:36,fontWeight:900,color:"#171717",margin:0,letterSpacing:-1}}>community board</h1>
        <div style={{display:"flex",gap:8}}>
          <button onClick={()=>setShowCommunity(false)} style={{fontFamily:sans,fontSize:12,padding:"8px 16px",background:"transparent",border:"1px solid #e5e5e5",borderRadius:99,cursor:"pointer",color:"#a3a3a3"}}>← your board</button>
        </div>
      </div>
      <p style={{fontFamily:sans,fontSize:13,color:"#a3a3a3",margin:"0 0 20px"}}>averaged across {communityBoard.totalUsers} user{communityBoard.totalUsers!==1?"s":""} · your rank shown for comparison</p>

      {/* Overall top 25 */}
      <div style={{background:"#fff",border:"1px solid #e5e5e5",borderRadius:12,padding:"16px 20px",marginBottom:16}}>
        <div style={{fontFamily:mono,fontSize:8,letterSpacing:1.5,color:"#a3a3a3",textTransform:"uppercase",marginBottom:10}}>overall top 25</div>
        {PROSPECTS.filter(p=>communityBoard.ratings[p.id]).sort((a,b)=>(communityBoard.ratings[b.id]||0)-(communityBoard.ratings[a.id]||0)).slice(0,25).map((p,i)=>{
          const userIdx=board.findIndex(x=>x.id===p.id);const diff=userIdx>=0?i-userIdx:null;const c=POS_COLORS[p.gpos||p.pos]||POS_COLORS[p.pos];const voters=communityBoard.voterCount?.[p.id]||0;
          return<div key={p.id} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 0",borderBottom:i<24?"1px solid #f8f8f8":"none"}}>
            <span style={{fontFamily:mono,fontSize:11,color:"#d4d4d4",width:20,textAlign:"right"}}>{i+1}</span>
            <span style={{fontFamily:mono,fontSize:9,color:c,width:32}}>{p.gpos||p.pos}</span>
            <SchoolLogo school={p.school} size={18}/>
            <span style={{fontFamily:sans,fontSize:13,fontWeight:600,color:"#171717",flex:1,cursor:"pointer"}} onClick={()=>setProfilePlayer(p)} onMouseEnter={e=>e.currentTarget.style.textDecoration="underline"} onMouseLeave={e=>e.currentTarget.style.textDecoration="none"}>{p.name}</span>
            {voters>1&&<span style={{fontFamily:mono,fontSize:9,color:"#a3a3a3"}}>{voters} votes</span>}
            {diff!==null&&<span style={{fontFamily:mono,fontSize:10,fontWeight:600,color:diff>0?"#16a34a":diff<0?"#dc2626":"#a3a3a3"}}>{diff>0?`↑${diff}`:diff<0?`↓${Math.abs(diff)}`:"="}</span>}
            {userIdx>=0&&<span style={{fontFamily:mono,fontSize:9,color:"#a3a3a3"}}>you: #{userIdx+1}</span>}
          </div>;
        })}
      </div>

      {/* Per-position top 5 */}
      <div style={{background:"#fff",border:"1px solid #e5e5e5",borderRadius:12,padding:"16px 20px"}}>
        <div style={{fontFamily:mono,fontSize:8,letterSpacing:1.5,color:"#a3a3a3",textTransform:"uppercase",marginBottom:10}}>by position</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill, minmax(200px, 1fr))",gap:8}}>
          {POSITION_GROUPS.filter(g=>g!=="K/P").map(gpos=>{
            const posPlayers=PROSPECTS.filter(p=>(p.gpos||p.pos)===gpos&&communityBoard.ratings[p.id]).sort((a,b)=>(communityBoard.ratings[b.id]||0)-(communityBoard.ratings[a.id]||0)).slice(0,5);
            if(posPlayers.length===0)return null;const c=POS_COLORS[gpos]||"#737373";
            return<div key={gpos} style={{background:"#f9f9f7",borderRadius:8,padding:"8px 10px"}}>
              <div style={{fontFamily:font,fontSize:14,fontWeight:900,color:c,marginBottom:4}}>{gpos}</div>
              {posPlayers.map((p,i)=>{
                const posPlayers_all=PROSPECTS.filter(p2=>{const g=p2.gpos||p2.pos;return g===gpos;});
                const myRank=posPlayers_all.length>0?[...posPlayers_all].sort((a,b)=>(ratings[b.id]||1500)-(ratings[a.id]||1500)).findIndex(x=>x.id===p.id)+1:-1;
                return<div key={p.id} style={{display:"flex",alignItems:"center",gap:4,padding:"2px 0"}}>
                  <span style={{fontFamily:mono,fontSize:9,color:"#d4d4d4",width:14,textAlign:"right"}}>{i+1}</span>
                  <span style={{fontFamily:sans,fontSize:11,fontWeight:500,color:"#171717",flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.name}</span>
                  {myRank>0&&rankedGroups.has(gpos)&&<span style={{fontFamily:mono,fontSize:8,color:myRank<=i+1?"#16a34a":"#dc2626"}}>you: #{myRank}</span>}
                </div>;
              })}
            </div>;
          })}
        </div>
      </div>
    </>

    :

    /* === YOUR BOARD MODE === */
    <>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
        <h1 style={{fontSize:36,fontWeight:900,color:"#171717",margin:0,letterSpacing:-1}}>your big board</h1>
        <div style={{display:"flex",gap:8}}>
          <button onClick={()=>setPhase("pick-position")} style={{fontFamily:sans,fontSize:12,padding:"8px 16px",background:"transparent",border:"1px solid #e5e5e5",borderRadius:99,cursor:"pointer",color:"#a3a3a3"}}>← edit</button>
        </div>
      </div>
      <p style={{fontFamily:sans,fontSize:13,color:"#a3a3a3",margin:"0 0 12px"}}>{display.length} prospects ranked</p>

      <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:12}}>
        <button onClick={shareTop10} style={{fontFamily:sans,fontSize:11,fontWeight:600,padding:"6px 14px",background:"#171717",color:"#faf9f6",border:"none",borderRadius:99,cursor:"pointer"}}>📤 share top 10</button>
        <button onClick={loadCommunity} style={{fontFamily:sans,fontSize:11,fontWeight:600,padding:"6px 14px",background:"transparent",color:"#525252",border:"1px solid #e5e5e5",borderRadius:99,cursor:"pointer"}}>👥 community board</button>
        <button onClick={()=>setShowMockDraft(true)} style={{fontFamily:sans,fontSize:11,fontWeight:600,padding:"6px 14px",background:"transparent",color:"#525252",border:"1px solid #e5e5e5",borderRadius:99,cursor:"pointer"}}>🏈 mock draft</button>
      </div>

      <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:20}}><button onClick={()=>setFilterPos(null)} style={{fontFamily:mono,fontSize:11,padding:"5px 14px",background:!filterPos?"#171717":"transparent",color:!filterPos?"#faf9f6":"#a3a3a3",border:"1px solid #e5e5e5",borderRadius:99,cursor:"pointer"}}>all</button>{POSITION_GROUPS.filter(p=>rankedGroups.has(p)).map(pos=><button key={pos} onClick={()=>setFilterPos(filterPos===pos?null:pos)} style={{fontFamily:mono,fontSize:11,padding:"5px 14px",background:filterPos===pos?`${POS_COLORS[pos]}11`:"transparent",color:filterPos===pos?POS_COLORS[pos]:"#a3a3a3",border:`1px solid ${filterPos===pos?POS_COLORS[pos]+"33":"#e5e5e5"}`,borderRadius:99,cursor:"pointer"}}>{pos}</button>)}</div>{showCompareTip&&compareList.length===0&&<div style={{background:"linear-gradient(135deg,#fdf4ff,#f5f3ff)",border:"1px solid #e9d5ff",borderRadius:12,padding:"12px 16px",marginBottom:16,display:"flex",alignItems:"center",justifyContent:"space-between"}}><span style={{fontFamily:sans,fontSize:13,color:"#7c3aed"}}>💡 Click rows to compare up to 4 prospects head-to-head on traits</span><button onClick={dismissCompareTip} style={{fontFamily:sans,fontSize:11,color:"#a3a3a3",background:"none",border:"none",cursor:"pointer",flexShrink:0}}>✕</button></div>}{compareList.length>0&&<div style={{background:"#fff",border:"1px solid #e5e5e5",borderRadius:12,padding:16,marginBottom:16}}>
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
    </div>}<div style={{background:"#fff",border:"1px solid #e5e5e5",borderRadius:12,overflow:"hidden"}}>{display.map((p,i)=>{const grade=getGrade(p.id);const c=POS_COLORS[p.gpos||p.pos]||POS_COLORS[p.pos];const cIdx=compareList.indexOf(p.id);const isC=cIdx>=0;return<div key={p.id} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 16px",borderBottom:i<display.length-1?"1px solid #f5f5f5":"none",cursor:"pointer",background:isC?`${compColors[cIdx]}08`:"transparent"}} onMouseEnter={e=>{if(!isC)e.currentTarget.style.background=`${c}06`;}} onMouseLeave={e=>{if(!isC)e.currentTarget.style.background="transparent";}} onClick={()=>{if(showCompareTip)dismissCompareTip();if(isC)setCompareList(prev=>prev.filter(id=>id!==p.id));else if(compareList.length<4)setCompareList(prev=>[...prev,p.id]);}} onDoubleClick={()=>{setSelectedPlayer(p);setActivePos(p.gpos||p.pos);setPhase("traits");}}>{isC&&<div style={{width:6,height:6,borderRadius:99,background:compColors[cIdx],flexShrink:0}}/>}<span style={{fontFamily:mono,fontSize:12,color:"#d4d4d4",width:28,textAlign:"right",flexShrink:0}}>{i+1}</span><span style={{fontFamily:mono,fontSize:10,fontWeight:500,color:c,background:`${c}0d`,padding:"2px 8px",borderRadius:4,flexShrink:0}}>{p.gpos||p.pos}</span><SchoolLogo school={p.school} size={24}/><div style={{flex:1,minWidth:0}}><span style={{fontFamily:sans,fontSize:14,fontWeight:700,color:"#171717",cursor:"pointer"}} onClick={e=>{e.stopPropagation();setProfilePlayer(p);}} onMouseEnter={e=>e.currentTarget.style.textDecoration="underline"} onMouseLeave={e=>e.currentTarget.style.textDecoration="none"}>{p.name}</span><span style={{fontFamily:mono,fontSize:11,color:"#a3a3a3",marginLeft:8}}>{p.school}</span></div><div style={{width:80,display:"flex",alignItems:"center",gap:6,flexShrink:0}}><div style={{flex:1,height:4,background:"#f5f5f5",borderRadius:2,overflow:"hidden"}}><div style={{height:"100%",width:`${grade}%`,background:c,borderRadius:2,opacity:.6}}/></div><span style={{fontFamily:font,fontSize:14,fontWeight:900,color:grade>=75?"#16a34a":grade>=55?"#ca8a04":"#dc2626",width:24,textAlign:"right"}}>{grade}</span></div></div>;})}</div><p style={{fontFamily:sans,fontSize:11,color:"#a3a3a3",textAlign:"center",marginTop:16}}>click name for profile · click row to compare (up to 4) · double-click to edit</p>
    </>}
    </div></div>);
}

// ============================================================
// Root App: handles auth state
// ============================================================
export default function App(){
  const[user,setUser]=useState(null);
  const[loading,setLoading]=useState(true);

  useEffect(()=>{
    supabase.auth.getSession().then(({data:{session}})=>{
      const u=session?.user||null;
      setUser(u);
      if(u){setTrackingUser(u.id);trackOnce("signup");}
      setLoading(false);
    });
    const{data:{subscription}}=supabase.auth.onAuthStateChange((_,session)=>{
      const u=session?.user||null;
      setUser(u);
      if(u)setTrackingUser(u.id);
    });
    return()=>subscription.unsubscribe();
  },[]);

  const signOut=async()=>{await supabase.auth.signOut();setUser(null);};

  if(loading)return<div style={{minHeight:"100vh",background:"#faf9f6",display:"flex",alignItems:"center",justifyContent:"center"}}><p style={{fontFamily:"'DM Sans',sans-serif",fontSize:14,color:"#a3a3a3"}}>loading...</p></div>;
  if(!user)return<AuthScreen/>;
  return<ErrorBoundary><DraftBoard user={user} onSignOut={signOut}/></ErrorBoundary>;
}
