#!/usr/bin/env node
/**
 * BBL Combine Auto-Updater
 * 
 * Fetches 2026 combine data from nflverse (free, open-source, auto-updated),
 * matches against BBL's 458 prospects, and regenerates combine-results.html.
 * 
 * USAGE:
 *   node update-combine.js
 * 
 * That's it. One command. Run it as often as you want during combine week.
 * 
 * DATA SOURCES (tried in order):
 *   1. nflverse GitHub CSV (primary - usually updated within hours of results)
 *   2. Manual fallback CSV at ./combine-manual.csv (if you want to add data yourself)
 * 
 * The script merges all sources - nflverse data wins if there's a conflict,
 * then manual CSV fills gaps. Your BBL prospect list is always the base.
 */

import https from 'https';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ============================================================
// CONFIG
// ============================================================
const NFLVERSE_COMBINE_URL = 'https://github.com/nflverse/nflverse-data/releases/download/combine/combine.csv';
const MANUAL_CSV_PATH = path.join(__dirname, 'combine-manual.csv');
const HTML_TEMPLATE_PATH = path.join(__dirname, 'public', 'blog', '2026-nfl-combine-results.html');
const OUTPUT_PATH = path.join(__dirname, 'public', 'blog', '2026-nfl-combine-results.html');
const COMBINE_JSON_PATH = path.join(__dirname, 'src', 'combineData.json');
const SEASON = 2026;

// ============================================================
// BBL PROSPECT LIST (from App.jsx PROSPECTS_RAW)
// ============================================================
const BBL_PROSPECTS = [
{name:"Fernando Mendoza",pos:"QB",school:"Indiana",rank:1,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Ty Simpson",pos:"QB",school:"Alabama",rank:2,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Garrett Nussmeier",pos:"QB",school:"LSU",rank:3,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Drew Allar",pos:"QB",school:"Penn State",rank:4,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Carson Beck",pos:"QB",school:"Miami",rank:5,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Cole Payton",pos:"QB",school:"North Dakota State",rank:6,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Sawyer Robertson",pos:"QB",school:"Baylor",rank:7,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Taylen Green",pos:"QB",school:"Arkansas",rank:8,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Jalon Daniels",pos:"QB",school:"Kansas",rank:9,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Cade Klubnik",pos:"QB",school:"Clemson",rank:10,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Luke Altmyer",pos:"QB",school:"Illinois",rank:11,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Miller Moss",pos:"QB",school:"Louisville",rank:12,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Behren Morton",pos:"QB",school:"Texas Tech",rank:13,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Joe Fagnano",pos:"QB",school:"UConn",rank:14,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Athan Kaliakmanis",pos:"QB",school:"Rutgers",rank:15,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Diego Pavia",pos:"QB",school:"Vanderbilt",rank:16,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Mark Gronowski",pos:"QB",school:"Iowa",rank:17,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Haynes King",pos:"QB",school:"Georgia Tech",rank:18,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Joey Aguilar",pos:"QB",school:"Tennessee",rank:19,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Jeremiyah Love",pos:"RB",school:"Notre Dame",rank:20,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Jadarian Price",pos:"RB",school:"Notre Dame",rank:21,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Jonah Coleman",pos:"RB",school:"Washington",rank:22,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Emmett Johnson",pos:"RB",school:"Nebraska",rank:23,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Mike Washington Jr.",pos:"RB",school:"Arkansas",rank:24,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Kaytron Allen",pos:"RB",school:"Penn State",rank:25,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Nicholas Singleton",pos:"RB",school:"Penn State",rank:26,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Kaelon Black",pos:"RB",school:"Indiana",rank:27,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Roman Hemby",pos:"RB",school:"Indiana",rank:28,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Demond Claiborne",pos:"RB",school:"Wake Forest",rank:29,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"J'Mari Taylor",pos:"RB",school:"Virginia",rank:30,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Adam Randall",pos:"RB",school:"Clemson",rank:31,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Robert Henry Jr.",pos:"RB",school:"UTSA",rank:32,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Seth McGowan",pos:"RB",school:"Kentucky",rank:33,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Eli Heidenreich",pos:"RB",school:"Navy",rank:34,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Le'Veon Moss",pos:"RB",school:"Texas A&M",rank:35,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Noah Whittington",pos:"RB",school:"Oregon",rank:36,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Jam Miller",pos:"RB",school:"Alabama",rank:37,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Jaydn Ott",pos:"RB",school:"Oklahoma",rank:38,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Chip Trayanum",pos:"RB",school:"Toledo",rank:39,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Kejon Owens",pos:"RB",school:"Florida International",rank:40,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Kentrel Bullock",pos:"RB",school:"South Alabama",rank:41,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Jamal Haynes",pos:"RB",school:"Georgia Tech",rank:42,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Curtis Allen",pos:"RB",school:"Virginia Union",rank:43,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"CJ Donaldson",pos:"RB",school:"Ohio State",rank:44,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Desmond Reid",pos:"RB",school:"Pittsburgh",rank:45,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Max Bredeson",pos:"RB",school:"Michigan",rank:46,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Dean Connors",pos:"RB",school:"Houston",rank:47,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Rahsul Faison",pos:"RB",school:"South Carolina",rank:48,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Carnell Tate",pos:"WR",school:"Ohio State",rank:49,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Jordyn Tyson",pos:"WR",school:"Arizona State",rank:50,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Makai Lemon",pos:"WR",school:"USC",rank:51,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Denzel Boston",pos:"WR",school:"Washington",rank:52,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"KC Concepcion",pos:"WR",school:"Texas A&M",rank:53,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Omar Cooper Jr.",pos:"WR",school:"Indiana",rank:54,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Zachariah Branch",pos:"WR",school:"Georgia",rank:55,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Chris Bell",pos:"WR",school:"Louisville",rank:56,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Chris Brazzell II",pos:"WR",school:"Tennessee",rank:57,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Malachi Fields",pos:"WR",school:"Notre Dame",rank:58,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Elijah Sarratt",pos:"WR",school:"Indiana",rank:59,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Germie Bernard",pos:"WR",school:"Alabama",rank:60,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Antonio Williams",pos:"WR",school:"Clemson",rank:61,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Ted Hurst",pos:"WR",school:"Georgia State",rank:62,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Ja'Kobi Lane",pos:"WR",school:"USC",rank:63,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Skyler Bell",pos:"WR",school:"UConn",rank:64,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Deion Burks",pos:"WR",school:"Oklahoma",rank:65,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Kevin Coleman Jr.",pos:"WR",school:"Missouri",rank:66,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Josh Cameron",pos:"WR",school:"Baylor",rank:67,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Brenen Thompson",pos:"WR",school:"Mississippi State",rank:68,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Bryce Lance",pos:"WR",school:"North Dakota State",rank:69,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"CJ Daniels",pos:"WR",school:"Miami",rank:70,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Reggie Virgil",pos:"WR",school:"Texas Tech",rank:71,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Kaden Wetjen",pos:"WR",school:"Iowa",rank:72,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Eric McAlister",pos:"WR",school:"TCU",rank:73,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"De'Zhaun Stribling",pos:"WR",school:"Mississippi",rank:74,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Barion Brown",pos:"WR",school:"LSU",rank:75,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Lewis Bond",pos:"WR",school:"Boston College",rank:76,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Chase Roberts",pos:"WR",school:"BYU",rank:77,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Caleb Douglas",pos:"WR",school:"Texas Tech",rank:78,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Aaron Anderson",pos:"WR",school:"LSU",rank:79,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Jordan Hudson",pos:"WR",school:"SMU",rank:80,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Dane Key",pos:"WR",school:"Nebraska",rank:81,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Tyren Montgomery",pos:"WR",school:"John Carroll",rank:82,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Emmanuel Henderson Jr.",pos:"WR",school:"Kansas",rank:83,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Cyrus Allen",pos:"WR",school:"Cincinnati",rank:84,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Eric Rivers",pos:"WR",school:"Georgia Tech",rank:85,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Zavion Thomas",pos:"WR",school:"LSU",rank:86,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Caullin Lacy",pos:"WR",school:"Louisville",rank:87,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Devin Voisin",pos:"WR",school:"South Alabama",rank:88,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Colbie Young",pos:"WR",school:"Georgia",rank:89,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Jeff Caldwell",pos:"WR",school:"Cincinnati",rank:90,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Malik Benson",pos:"WR",school:"Oregon",rank:91,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Michael Wortham",pos:"WR",school:"Montana",rank:92,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Vinny Anthony II",pos:"WR",school:"Wisconsin",rank:93,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Chris Hilton Jr.",pos:"WR",school:"LSU",rank:94,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Hank Beatty",pos:"WR",school:"Illinois",rank:95,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Kendrick Law",pos:"WR",school:"Kentucky",rank:96,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Keelan Marion",pos:"WR",school:"Miami (FL)",rank:97,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"J. Michael Sturdivant",pos:"WR",school:"Florida",rank:98,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Noah Thomas",pos:"WR",school:"Georgia",rank:99,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Dillon Bell",pos:"WR",school:"Georgia",rank:100,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Romello Brinson",pos:"WR",school:"SMU",rank:101,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Squirrel White",pos:"WR",school:"Florida State",rank:102,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Harrison Wallace III",pos:"WR",school:"Mississippi",rank:103,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Griffin Wilde",pos:"WR",school:"Northwestern",rank:104,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Jalil Farooq",pos:"WR",school:"Maryland",rank:105,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Donaven McCulley",pos:"WR",school:"Michigan",rank:106,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Jalen Walthall",pos:"WR",school:"Incarnate Word",rank:107,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Kenyon Sadiq",pos:"TE",school:"Oregon",rank:108,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Eli Stowers",pos:"TE",school:"Vanderbilt",rank:109,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Max Klare",pos:"TE",school:"Ohio State",rank:110,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Michael Trigg",pos:"TE",school:"Baylor",rank:111,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Justin Joly",pos:"TE",school:"N.C. State",rank:112,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Oscar Delp",pos:"TE",school:"Georgia",rank:113,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Jack Endries",pos:"TE",school:"Texas",rank:114,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Joe Royer",pos:"TE",school:"Cincinnati",rank:115,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Tanner Koziol",pos:"TE",school:"Houston",rank:116,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Dallen Bentley",pos:"TE",school:"Utah",rank:117,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Sam Roush",pos:"TE",school:"Stanford",rank:118,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Nate Boerkircher",pos:"TE",school:"Texas A&M",rank:119,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Eli Raridon",pos:"TE",school:"Notre Dame",rank:120,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Dae'Quan Wright",pos:"TE",school:"Mississippi",rank:121,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"John Michael Gyllenborg",pos:"TE",school:"Wyoming",rank:122,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Riley Nowakowski",pos:"TE",school:"Indiana",rank:123,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Josh Cuevas",pos:"TE",school:"Alabama",rank:124,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Marlin Klein",pos:"TE",school:"Michigan",rank:125,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Dan Villari",pos:"TE",school:"Syracuse",rank:126,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Will Kacmarek",pos:"TE",school:"Ohio State",rank:127,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"RJ Maryland",pos:"TE",school:"SMU",rank:128,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Carsen Ryan",pos:"TE",school:"BYU",rank:129,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Seydou Traore",pos:"TE",school:"Mississippi State",rank:130,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Miles Kitselman",pos:"TE",school:"Tennessee",rank:131,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Bauer Sharp",pos:"TE",school:"LSU",rank:132,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Khalil Dinkins",pos:"TE",school:"Penn State",rank:133,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Lake McRee",pos:"TE",school:"USC",rank:134,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Tanner Arkin",pos:"TE",school:"Illinois",rank:135,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Lance Mason",pos:"TE",school:"Wisconsin",rank:136,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Jaren Kanak",pos:"TE",school:"Oklahoma",rank:137,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Matthew Hibner",pos:"TE",school:"SMU",rank:138,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"DJ Rogers",pos:"TE",school:"TCU",rank:139,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Jameson Geers",pos:"TE",school:"Minnesota",rank:140,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Francis Mauigoa",pos:"OL",school:"Miami",rank:141,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Spencer Fano",pos:"OL",school:"Utah",rank:142,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Olaivavega Ioane",pos:"OL",school:"Penn State",rank:143,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Kadyn Proctor",pos:"OL",school:"Alabama",rank:144,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Caleb Lomu",pos:"OL",school:"Utah",rank:145,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Monroe Freeling",pos:"OL",school:"Georgia",rank:146,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Blake Miller",pos:"OL",school:"Clemson",rank:147,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Emmanuel Pregnon",pos:"OL",school:"Oregon",rank:148,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Max Iheanachor",pos:"OL",school:"Arizona State",rank:149,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Chase Bisontis",pos:"OL",school:"Texas A&M",rank:150,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Gennings Dunker",pos:"OL",school:"Iowa",rank:151,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Caleb Tiernan",pos:"OL",school:"Northwestern",rank:152,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Connor Lew",pos:"OL",school:"Auburn",rank:153,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Sam Hecht",pos:"OL",school:"Kansas State",rank:154,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Isaiah World",pos:"OL",school:"Oregon",rank:155,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Brian Parker II",pos:"OL",school:"Duke",rank:156,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Keylan Rutledge",pos:"OL",school:"Georgia Tech",rank:157,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Jake Slaughter",pos:"OL",school:"Florida",rank:158,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Logan Jones",pos:"OL",school:"Iowa",rank:159,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Beau Stephens",pos:"OL",school:"Iowa",rank:160,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Parker Brailsford",pos:"OL",school:"Alabama",rank:161,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Austin Barber",pos:"OL",school:"Florida",rank:162,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Kage Casey",pos:"OL",school:"Boise State",rank:163,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Dametrious Crownover",pos:"OL",school:"Texas A&M",rank:164,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"J.C. Davis",pos:"OL",school:"Illinois",rank:165,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Jude Bowry",pos:"OL",school:"Boston College",rank:166,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Pat Coogan",pos:"OL",school:"Indiana",rank:167,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Drew Shelton",pos:"OL",school:"Penn State",rank:168,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Jalen Farmer",pos:"OL",school:"Kentucky",rank:169,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Trey Zuhn III",pos:"OL",school:"Texas A&M",rank:170,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Jeremiah Wright",pos:"OL",school:"Auburn",rank:171,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Fernando Carmona",pos:"OL",school:"Arkansas",rank:172,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Ar'maj Reed-Adams",pos:"OL",school:"Texas A&M",rank:173,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"DJ Campbell",pos:"OL",school:"Texas",rank:174,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Fa'alili Fa'amoe",pos:"OL",school:"Wake Forest",rank:175,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Matt Gulbin",pos:"OL",school:"Michigan State",rank:176,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Jager Burton",pos:"OL",school:"Kentucky",rank:177,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Keagen Trost",pos:"OL",school:"Missouri",rank:178,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Aamil Wagner",pos:"OL",school:"Notre Dame",rank:179,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Markel Bell",pos:"OL",school:"Miami",rank:180,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Febechi Nwaiwu",pos:"OL",school:"Oklahoma",rank:181,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Jaeden Roberts",pos:"OL",school:"Alabama",rank:182,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Billy Schrauth",pos:"OL",school:"Notre Dame",rank:183,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Anez Cooper",pos:"OL",school:"Miami",rank:184,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"James Brockermeyer",pos:"OL",school:"Miami (FL)",rank:185,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Riley Mahlman",pos:"OL",school:"Wisconsin",rank:186,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Carver Willis",pos:"OL",school:"Washington",rank:187,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Connor Tollison",pos:"OL",school:"Missouri",rank:188,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Alex Harkey",pos:"OL",school:"Oregon",rank:189,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Micah Morris",pos:"OL",school:"Georgia",rank:190,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Logan Taylor",pos:"OL",school:"Boston College",rank:191,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Tristan Leigh",pos:"OL",school:"Clemson",rank:192,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Caden Barnett",pos:"OL",school:"Wyoming",rank:193,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Delby Lemieux",pos:"OL",school:"Dartmouth",rank:194,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Andrew Gentry",pos:"OL",school:"BYU",rank:195,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"James Neal",pos:"OL",school:"Iowa State",rank:196,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Giovanni El-Hadi",pos:"OL",school:"Michigan",rank:197,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Travis Burke",pos:"OL",school:"Memphis",rank:198,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Dillon Wade",pos:"OL",school:"Auburn",rank:199,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Joe Cooper",pos:"OL",school:"Slippery Rock",rank:200,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Evan Beerntsen",pos:"OL",school:"Northwestern",rank:201,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Jayden Williams",pos:"OL",school:"Mississippi",rank:202,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Kobe Baynes",pos:"OL",school:"Kansas",rank:203,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Garrett DiGiorgio",pos:"OL",school:"UCLA",rank:204,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Nolan Rucci",pos:"OL",school:"Penn State",rank:205,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Elijah Pritchett",pos:"OL",school:"Nebraska",rank:206,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Ethan Onianwa",pos:"OL",school:"Ohio State",rank:207,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Ka'ena Decambra",pos:"OL",school:"Arizona",rank:208,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Reuben Unije",pos:"OL",school:"UCLA",rank:209,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Alan Herron",pos:"OL",school:"Maryland",rank:210,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Joshua Braun",pos:"OL",school:"Kentucky",rank:211,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Tomas Rimac",pos:"OL",school:"Virginia Tech",rank:212,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Izavion Miller",pos:"OL",school:"Auburn",rank:213,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"P.J. Williams",pos:"OL",school:"SMU",rank:214,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Sheridan Wilson",pos:"OL",school:"Texas Tech",rank:215,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Trevor Lauck",pos:"OL",school:"Iowa",rank:216,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Dorion Strawn",pos:"OL",school:"Texas State",rank:217,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Josh Thompson",pos:"OL",school:"LSU",rank:218,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Derek Simmons",pos:"OL",school:"Oklahoma",rank:219,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Diego Pounds",pos:"OL",school:"Mississippi",rank:220,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Braelin Moore",pos:"OL",school:"LSU",rank:221,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Bryce Foster",pos:"OL",school:"Kansas",rank:222,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Wendell Moe Jr.",pos:"OL",school:"Tennessee",rank:223,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Noah Josey",pos:"OL",school:"Virginia",rank:224,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Micah Pettus",pos:"OL",school:"Florida State",rank:225,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Rocco Spindler",pos:"OL",school:"Nebraska",rank:226,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Ben Taylor-Whitfield",pos:"OL",school:"TCU",rank:227,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Isaiah Jatta",pos:"OL",school:"BYU",rank:228,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Chris Adams",pos:"OL",school:"Memphis",rank:229,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Charles Jagusah",pos:"OL",school:"Notre Dame",rank:230,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Enrique Cruz Jr.",pos:"OL",school:"Kansas",rank:231,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Rueben Bain Jr.",pos:"DL",school:"Miami",rank:232,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"David Bailey",pos:"DL",school:"Texas Tech",rank:233,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Keldric Faulk",pos:"DL",school:"Auburn",rank:234,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Peter Woods",pos:"DL",school:"Clemson",rank:235,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Cashius Howell",pos:"DL",school:"Texas A&M",rank:236,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Caleb Banks",pos:"DL",school:"Florida",rank:237,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Akheem Mesidor",pos:"DL",school:"Miami",rank:238,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"T.J. Parker",pos:"DL",school:"Clemson",rank:239,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Kayden McDonald",pos:"DL",school:"Ohio State",rank:240,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Lee Hunter",pos:"DL",school:"Texas Tech",rank:241,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Zion Young",pos:"DL",school:"Missouri",rank:242,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"R Mason Thomas",pos:"DL",school:"Oklahoma",rank:243,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Christen Miller",pos:"DL",school:"Georgia",rank:244,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"LT Overton",pos:"DL",school:"Alabama",rank:245,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Derrick Moore",pos:"DL",school:"Michigan",rank:246,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Joshua Josephs",pos:"DL",school:"Tennessee",rank:247,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Gabe Jacas",pos:"DL",school:"Illinois",rank:248,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Darrell Jackson Jr.",pos:"DL",school:"Florida State",rank:249,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Romello Height",pos:"DL",school:"Texas Tech",rank:250,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Domonique Orange",pos:"DL",school:"Iowa State",rank:251,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Dani Dennis-Sutton",pos:"DL",school:"Penn State",rank:252,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Malachi Lawrence",pos:"DL",school:"UCF",rank:253,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Dontay Corleone",pos:"DL",school:"Cincinnati",rank:254,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Gracen Halton",pos:"DL",school:"Oklahoma",rank:255,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Anthony Lucas",pos:"DL",school:"USC",rank:256,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Keyron Crawford",pos:"DL",school:"Auburn",rank:257,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Chris McClellan",pos:"DL",school:"Missouri",rank:258,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Rayshaun Benny",pos:"DL",school:"Michigan",rank:259,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Tim Keenan III",pos:"DL",school:"Alabama",rank:260,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Jaishawn Barham",pos:"DL",school:"Michigan",rank:261,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Mikail Kamara",pos:"DL",school:"Indiana",rank:262,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Skyler Gill-Howard",pos:"DL",school:"Texas Tech",rank:263,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Zane Durant",pos:"DL",school:"Penn State",rank:264,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"DeMonte Capehart",pos:"DL",school:"Clemson",rank:265,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Caden Curry",pos:"DL",school:"Ohio State",rank:266,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Tyreak Sapp",pos:"DL",school:"Florida",rank:267,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Nadame Tucker",pos:"DL",school:"Western Michigan",rank:268,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Vincent Anthony Jr.",pos:"DL",school:"Duke",rank:269,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Max Llewellyn",pos:"DL",school:"Iowa",rank:270,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Albert Regis",pos:"DL",school:"Texas A&M",rank:271,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Zxavian Harris",pos:"DL",school:"Mississippi",rank:272,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Kaleb Proctor",pos:"DL",school:"Southeastern Louisiana",rank:273,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Nick Barrett",pos:"DL",school:"South Carolina",rank:274,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"David Gusta",pos:"DL",school:"Kentucky",rank:275,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Deven Eastern",pos:"DL",school:"Minnesota",rank:276,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Landon Robinson",pos:"DL",school:"Navy",rank:277,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Quintayvious Hutchins",pos:"DL",school:"Boston College",rank:278,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Logan Fano",pos:"DL",school:"Utah",rank:279,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Trey Moore",pos:"DL",school:"Texas",rank:280,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Cameron Ball",pos:"DL",school:"Arkansas",rank:281,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Jeffrey M'ba",pos:"DL",school:"SMU",rank:282,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Nyjalik Kelly",pos:"DL",school:"UCF",rank:283,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Bryson Eason",pos:"DL",school:"Tennessee",rank:284,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Keyshawn James-Newby",pos:"DL",school:"New Mexico",rank:285,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Tyler Onyedim",pos:"DL",school:"Texas A&M",rank:286,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"TJ Guy",pos:"DL",school:"Michigan",rank:287,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"James Thompson Jr.",pos:"DL",school:"Illinois",rank:288,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Cole Brevard",pos:"DL",school:"Texas",rank:289,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Aaron Hall",pos:"DL",school:"Duke",rank:290,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Patrick Payton",pos:"DL",school:"LSU",rank:291,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Michael Heldman",pos:"DL",school:"Central Michigan",rank:292,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Aidan Hubbard",pos:"DL",school:"Northwestern",rank:293,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Jackson Kuwatch",pos:"DL",school:"Miami (OH)",rank:294,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"David Blay",pos:"DL",school:"Miami (FL)",rank:295,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Gary Smith III",pos:"DL",school:"UCLA",rank:296,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Eric O'Neill",pos:"DL",school:"Rutgers",rank:297,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Wesley Williams",pos:"DL",school:"Duke",rank:298,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Keeshawn Silver",pos:"DL",school:"USC",rank:299,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Mason Reiger",pos:"DL",school:"Wisconsin",rank:300,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Damonic Williams",pos:"DL",school:"Oklahoma",rank:301,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Jack Pyburn",pos:"DL",school:"LSU",rank:302,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Terry Webb",pos:"DL",school:"SMU",rank:303,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Aaron Graves",pos:"DL",school:"Iowa",rank:304,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"George Gumbs Jr.",pos:"DL",school:"Florida",rank:305,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Bryan Thomas Jr.",pos:"DL",school:"South Carolina",rank:306,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Kalil Alexander",pos:"DL",school:"Texas State",rank:307,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Jackie Marshall",pos:"DL",school:"Baylor",rank:308,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Jahiem Lawson",pos:"DL",school:"Clemson",rank:309,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Ethan Burke",pos:"DL",school:"Texas",rank:310,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Tyre West",pos:"DL",school:"Tennessee",rank:311,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Cian Slone",pos:"DL",school:"NC State",rank:312,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"D.J. Hicks",pos:"DL",school:"Texas A&M",rank:313,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Rene Konga",pos:"DL",school:"Louisville",rank:314,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Michael Kilbane",pos:"DL",school:"Northwestern",rank:315,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Dominic Bailey",pos:"DL",school:"Tennessee",rank:316,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Dayon Hayes",pos:"DL",school:"Texas A&M",rank:317,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Devean Deal",pos:"DL",school:"TCU",rank:318,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Marvin Jones Jr.",pos:"DL",school:"Oklahoma",rank:319,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Jayden Virgin-Morgan",pos:"DL",school:"Boise State",rank:320,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Jordan van den Berg",pos:"DL",school:"Georgia Tech",rank:321,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Hero Kanu",pos:"DL",school:"Texas",rank:322,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Clay Patterson",pos:"DL",school:"Stanford",rank:323,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Brandon Cleveland",pos:"DL",school:"N.C. State",rank:324,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Bobby Jamison-Travis",pos:"DL",school:"Auburn",rank:325,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Arvell Reese",pos:"LB",school:"Ohio State",rank:326,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Sonny Styles",pos:"LB",school:"Ohio State",rank:327,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"CJ Allen",pos:"LB",school:"Georgia",rank:328,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Anthony Hill Jr.",pos:"LB",school:"Texas",rank:329,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Jake Golday",pos:"LB",school:"Cincinnati",rank:330,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Jacob Rodriguez",pos:"LB",school:"Texas Tech",rank:331,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Josiah Trotter",pos:"LB",school:"Missouri",rank:332,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Kyle Louis",pos:"LB",school:"Pittsburgh",rank:333,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Deontae Lawson",pos:"LB",school:"Alabama",rank:334,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Harold Perkins Jr.",pos:"LB",school:"LSU",rank:335,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Taurean York",pos:"LB",school:"Texas A&M",rank:336,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Lander Barton",pos:"LB",school:"Utah",rank:337,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Bryce Boettcher",pos:"LB",school:"Oregon",rank:338,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Aiden Fisher",pos:"LB",school:"Indiana",rank:339,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Kendal Daniels",pos:"LB",school:"Oklahoma",rank:340,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Keyshaun Elliott",pos:"LB",school:"Arizona State",rank:341,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Eric Gentry",pos:"LB",school:"USC",rank:342,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Xavian Sorey Jr.",pos:"LB",school:"Arkansas",rank:343,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Kaleb Elarms-Orr",pos:"LB",school:"TCU",rank:344,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Jack Kelly",pos:"LB",school:"BYU",rank:345,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Justin Jefferson",pos:"LB",school:"Alabama",rank:346,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Jimmy Rolder",pos:"LB",school:"Michigan",rank:347,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Namdi Obiazor",pos:"LB",school:"TCU",rank:348,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Scooby Williams",pos:"LB",school:"Texas A&M",rank:349,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Red Murdock",pos:"LB",school:"Buffalo",rank:350,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Wesley Bissainthe",pos:"LB",school:"Miami",rank:351,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Caden Fordham",pos:"LB",school:"NC State",rank:352,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"West Weeks",pos:"LB",school:"LSU",rank:353,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Karson Sharar",pos:"LB",school:"Iowa",rank:354,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Declan Williams",pos:"LB",school:"Incarnate Word",rank:355,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Jaden Dugger",pos:"LB",school:"Louisiana-Lafayette",rank:356,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Owen Heinecke",pos:"LB",school:"Oklahoma",rank:357,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Ernest Hausmann",pos:"LB",school:"Michigan",rank:358,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Isaiah Glasker",pos:"LB",school:"BYU",rank:359,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Kam Robinson",pos:"LB",school:"Virginia",rank:360,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Dariel Djabome",pos:"LB",school:"Rutgers",rank:361,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Wade Woodaz",pos:"LB",school:"Clemson",rank:362,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Caleb Downs",pos:"DB",school:"Ohio State",rank:363,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Mansoor Delane",pos:"DB",school:"LSU",rank:364,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Jermod McCoy",pos:"DB",school:"Tennessee",rank:365,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Avieon Terrell",pos:"DB",school:"Clemson",rank:366,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Brandon Cisse",pos:"DB",school:"South Carolina",rank:367,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Colton Hood",pos:"DB",school:"Tennessee",rank:368,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Emmanuel McNeil-Warren",pos:"DB",school:"Toledo",rank:369,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Dillon Thieneman",pos:"DB",school:"Oregon",rank:370,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Keith Abney II",pos:"DB",school:"Arizona State",rank:371,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Chris Johnson",pos:"DB",school:"San Diego State",rank:372,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Keionte Scott",pos:"DB",school:"Miami",rank:373,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"D'Angelo Ponds",pos:"DB",school:"Indiana",rank:374,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"A.J. Haulcy",pos:"DB",school:"LSU",rank:375,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Kamari Ramsey",pos:"DB",school:"USC",rank:376,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Davison Igbinosun",pos:"DB",school:"Ohio State",rank:377,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Zakee Wheatley",pos:"DB",school:"Penn State",rank:378,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Malik Muhammad",pos:"DB",school:"Texas",rank:379,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Devin Moore",pos:"DB",school:"Florida",rank:380,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Genesis Smith",pos:"DB",school:"Arizona",rank:381,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Chandler Rivers",pos:"DB",school:"Duke",rank:382,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Julian Neal",pos:"DB",school:"Arkansas",rank:383,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Treydan Stukes",pos:"DB",school:"Arizona",rank:384,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Jalon Kilgore",pos:"DB",school:"South Carolina",rank:385,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Bud Clark",pos:"DB",school:"TCU",rank:386,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Will Lee III",pos:"DB",school:"Texas A&M",rank:387,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Daylen Everette",pos:"DB",school:"Georgia",rank:388,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Michael Taaffe",pos:"DB",school:"Texas",rank:389,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Tacario Davis",pos:"DB",school:"Washington",rank:390,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Louis Moore",pos:"DB",school:"Indiana",rank:391,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Hezekiah Masses",pos:"DB",school:"Cal",rank:392,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Bishop Fitzgerald",pos:"DB",school:"USC",rank:393,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Ephesians Prysock",pos:"DB",school:"Washington",rank:394,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"TJ Hall",pos:"DB",school:"Iowa",rank:395,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"VJ Payne",pos:"DB",school:"Kansas State",rank:396,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Cole Wisniewski",pos:"DB",school:"Texas Tech",rank:397,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Domani Jackson",pos:"DB",school:"Alabama",rank:398,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Jadon Canady",pos:"DB",school:"Oregon",rank:399,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Devon Marshall",pos:"DB",school:"NC State",rank:400,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Thaddeus Dixon",pos:"DB",school:"North Carolina",rank:401,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Jakobe Thomas",pos:"DB",school:"Miami",rank:402,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Jalen Huskey",pos:"DB",school:"Maryland",rank:403,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Charles Demmings",pos:"DB",school:"Stephen F. Austin",rank:404,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Jalen McMurray",pos:"DB",school:"Tennessee",rank:405,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Andre Fuller",pos:"DB",school:"Toledo",rank:406,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Xavier Nwankpa",pos:"DB",school:"Iowa",rank:407,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Robert Spears-Jennings",pos:"DB",school:"Oklahoma",rank:408,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Jalen Stroman",pos:"DB",school:"Notre Dame",rank:409,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Devan Boykin",pos:"DB",school:"Indiana",rank:410,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Jalen Catalon",pos:"DB",school:"Missouri",rank:411,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Jeadyn Lukus",pos:"DB",school:"Clemson",rank:412,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Fred Davis II",pos:"DB",school:"Northwestern",rank:413,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Ceyair Wright",pos:"DB",school:"Nebraska",rank:414,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Jakari Foster",pos:"DB",school:"Louisiana Tech",rank:415,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"DeShon Singleton",pos:"DB",school:"Nebraska",rank:416,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"DJ Harvey",pos:"DB",school:"USC",rank:417,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Jaylon Guilbeau",pos:"DB",school:"Texas",rank:418,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"D.Q. Smith",pos:"DB",school:"South Carolina",rank:419,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Marcus Allen",pos:"DB",school:"North Carolina",rank:420,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Austin Brown",pos:"DB",school:"Wisconsin",rank:421,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Ahmari Harvey",pos:"DB",school:"Georgia Tech",rank:422,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Kolbey Taylor",pos:"DB",school:"Vanderbilt",rank:423,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Jarod Washington",pos:"DB",school:"South Carolina State",rank:424,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Myles Rowser",pos:"DB",school:"Arizona State",rank:425,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Dalton Johnson",pos:"DB",school:"Arizona",rank:426,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Josh Moten",pos:"DB",school:"Southern Miss",rank:427,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Dontae Balfour",pos:"DB",school:"Texas Tech",rank:428,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Skyler Thomas",pos:"DB",school:"Oregon State",rank:429,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Blake Cotton",pos:"DB",school:"Utah",rank:430,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Isaiah Nwokobia",pos:"DB",school:"SMU",rank:431,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Jacob Thomas",pos:"DB",school:"James Madison",rank:432,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Jerry Wilson",pos:"DB",school:"Florida State",rank:433,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Ricardo Hallman",pos:"DB",school:"Wisconsin",rank:434,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Collin Wright",pos:"DB",school:"Stanford",rank:435,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Wydett Williams Jr.",pos:"DB",school:"Mississippi",rank:436,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Brent Austin",pos:"DB",school:"California",rank:437,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Avery Smith",pos:"DB",school:"Toledo",rank:438,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Dalton Brooks",pos:"DB",school:"Texas A&M",rank:439,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Miles Scott",pos:"DB",school:"Illinois",rank:440,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Davaughn Patterson",pos:"DB",school:"Wake Forest",rank:441,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Ahmaad Moses",pos:"DB",school:"SMU",rank:442,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Toriano Pride Jr.",pos:"DB",school:"Missouri",rank:443,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Latrell McCutchin Sr.",pos:"DB",school:"Houston",rank:444,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Lorenzo Styles Jr.",pos:"DB",school:"Ohio State",rank:445,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Ryan Eckley",pos:"K/P",school:"Michigan State",rank:446,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Drew Stevens",pos:"K/P",school:"Iowa",rank:447,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Luke Basso",pos:"K/P",school:"Oregon",rank:448,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Beau Gardner",pos:"K/P",school:"Georgia",rank:449,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Will Ferrin",pos:"K/P",school:"BYU",rank:450,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Trey Smack",pos:"K/P",school:"Florida",rank:451,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Tommy Doman Jr.",pos:"K/P",school:"Florida",rank:452,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Garrison Grimes",pos:"K/P",school:"BYU",rank:453,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Tyler Duzansky",pos:"K/P",school:"Penn State",rank:454,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Jack Stonehouse",pos:"K/P",school:"Syracuse",rank:455,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Dominic Zvada",pos:"K/P",school:"Michigan",rank:456,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Palmer Williams",pos:"K/P",school:"Baylor",rank:457,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null},
{name:"Brett Thorson",pos:"K/P",school:"Georgia",rank:458,height:null,weight:null,forty:null,vertical:null,broad:null,bench:null,cone:null,shuttle:null}
];

// ============================================================
// HELPERS
// ============================================================

function fetchURL(url) {
  return new Promise((resolve, reject) => {
    const handler = (res) => {
      // Follow redirects (GitHub releases redirect to S3)
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        console.log(`  ↳ Following redirect...`);
        const mod = res.headers.location.startsWith('https') ? https : http;
        mod.get(res.headers.location, handler).on('error', reject);
        return;
      }
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode}`));
        return;
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    };
    https.get(url, { headers: { 'User-Agent': 'BBL-Combine-Updater/1.0' } }, handler).on('error', reject);
  });
}

function parseCSV(csvText) {
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) return [];
  
  // Parse header
  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, '').toLowerCase());
  
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const vals = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
    const row = {};
    headers.forEach((h, idx) => { row[h] = vals[idx] || null; });
    rows.push(row);
  }
  return rows;
}

// Normalize name for matching: lowercase, strip suffixes, normalize punctuation
function normName(name) {
  if (!name) return '';
  return name.toLowerCase()
    .replace(/\s+(jr\.?|sr\.?|ii|iii|iv|v)$/i, '') // strip suffixes
    .replace(/['.]/g, '')  // strip apostrophes and periods
    .replace(/\s+/g, ' ')
    .trim();
}

// Try to match a combine row to a BBL prospect
function findMatch(combineRow, bblMap) {
  const name = combineRow.player_name || combineRow.name || '';
  const school = combineRow.school || combineRow.college || '';
  
  // Try exact normalized name match
  const key1 = normName(name);
  if (bblMap[key1]) return bblMap[key1];
  
  // Try name + school combo
  const key2 = key1 + '|' + normName(school);
  if (bblMap[key2]) return bblMap[key2];
  
  // Try last name + school
  const parts = name.split(' ');
  const lastName = parts[parts.length - 1];
  const key3 = normName(lastName) + '|' + normName(school);
  if (bblMap[key3]) return bblMap[key3];
  
  return null;
}

function parseNum(v) {
  if (v === null || v === undefined || v === '' || v === 'NA' || v === 'DNP' || v === 'DNS') return null;
  const n = parseFloat(v);
  return isNaN(n) ? null : n;
}

function parseHeight(v) {
  if (!v || v === 'NA') return null;
  // nflverse format might be inches (e.g. 77) or "6-5" or "6'5"
  const n = parseInt(v);
  if (!isNaN(n) && n > 60 && n < 90) {
    // Convert total inches to feet-inches format
    const feet = Math.floor(n / 12);
    const inches = n % 12;
    return `${feet}-${inches}`;
  }
  // Already in readable format
  if (typeof v === 'string' && (v.includes('-') || v.includes("'"))) return v;
  return v;
}

// ============================================================
// MAIN
// ============================================================

async function main() {
  console.log('🏈 BBL Combine Auto-Updater\n');
  
  // Build lookup maps for BBL prospects
  const bblMap = {};
  BBL_PROSPECTS.forEach(p => {
    const nk = normName(p.name);
    bblMap[nk] = p;
    bblMap[nk + '|' + normName(p.school)] = p;
    // Also add last name + school
    const parts = p.name.split(' ');
    const lastName = parts[parts.length - 1];
    bblMap[normName(lastName) + '|' + normName(p.school)] = p;
  });

  // Initialize results map
  const results = {};
  BBL_PROSPECTS.forEach(p => {
    results[p.name] = {
      ...p,
      height: p.height || null,
      heightInches: null,
      weight: p.weight || null,
      forty: p.forty || null,
      vertical: p.vertical || null,
      broad: p.broad || null,
      bench: p.bench || null,
      cone: p.cone || null,
      shuttle: p.shuttle || null,
      arms: null,
      hands: null,
      wingspan: null,
    };
  });

  let matchCount = 0;

  // ---- SOURCE 1: nflverse CSV ----
  console.log('📡 Fetching nflverse combine data...');
  try {
    const csv = await fetchURL(NFLVERSE_COMBINE_URL);
    const rows = parseCSV(csv);
    // Filter to current season
    const current = rows.filter(r => parseInt(r.season) === SEASON);
    console.log(`  ✅ Got ${rows.length} total rows, ${current.length} for ${SEASON}`);

    current.forEach(row => {
      const match = findMatch(row, bblMap);
      if (match) {
        const r = results[match.name];
        const htRaw = parseNum(row.ht);
        const ht = parseHeight(row.ht);
        const wt = parseNum(row.wt);
        const forty = parseNum(row.forty);
        const vertical = parseNum(row.vertical);
        const broad = parseNum(row.broad_jump);
        const bench = parseNum(row.bench);
        const cone = parseNum(row.cone);
        const shuttle = parseNum(row.shuttle);

        const arms = parseNum(row.arms || row.arm_length || row.arm);
        const hands = parseNum(row.hands || row.hand_size || row.hand);
        const wing = parseNum(row.wingspan || row.wing);

        if (htRaw) r.heightInches = htRaw;
        if (ht) r.height = ht;
        if (wt) r.weight = wt;
        if (forty) r.forty = forty;
        if (vertical) r.vertical = vertical;
        if (broad) r.broad = broad;
        if (bench) r.bench = bench;
        if (cone) r.cone = cone;
        if (shuttle) r.shuttle = shuttle;
        if (arms) r.arms = arms;
        if (hands) r.hands = hands;
        if (wing) r.wingspan = wing;
        matchCount++;
      }
    });
    console.log(`  🔗 Matched ${matchCount} prospects to BBL board`);
  } catch (err) {
    console.log(`  ⚠️  nflverse fetch failed: ${err.message}`);
    console.log(`     (This is normal if 2026 combine data hasn't been published yet)`);
  }

  // ---- SOURCE 2: Manual CSV override ----
  if (fs.existsSync(MANUAL_CSV_PATH)) {
    console.log('\n📋 Loading manual CSV overrides...');
    const csv = fs.readFileSync(MANUAL_CSV_PATH, 'utf8');
    const rows = parseCSV(csv);
    let manualCount = 0;
    rows.forEach(row => {
      const match = findMatch(row, bblMap);
      if (match) {
        const r = results[match.name];
        // Manual only fills gaps - doesn't overwrite nflverse data
        const htRawManual = parseNum(row.height || row.ht);
        const ht = parseHeight(row.height || row.ht);
        if (htRawManual && !r.heightInches) r.heightInches = htRawManual;
        if (ht && !r.height) r.height = ht;
        if (!r.weight) r.weight = parseNum(row.weight || row.wt);
        if (!r.forty) r.forty = parseNum(row.forty || row['40']);
        if (!r.vertical) r.vertical = parseNum(row.vertical || row.vert);
        if (!r.broad) r.broad = parseNum(row.broad || row.broad_jump);
        if (!r.bench) r.bench = parseNum(row.bench);
        if (!r.cone) r.cone = parseNum(row.cone || row['3cone'] || row['3-cone']);
        if (!r.shuttle) r.shuttle = parseNum(row.shuttle);
        if (!r.arms) r.arms = parseNum(row.arms || row.arm_length || row.arm);
        if (!r.hands) r.hands = parseNum(row.hands || row.hand_size || row.hand);
        if (!r.wingspan) r.wingspan = parseNum(row.wingspan || row.wing);
        manualCount++;
      }
    });
    console.log(`  ✅ Applied ${manualCount} manual overrides`);
  }

  // ---- GENERATE OUTPUT ----
  console.log('\n📝 Generating combine-results.html...');
  
  // Read existing HTML template
  const html = fs.readFileSync(HTML_TEMPLATE_PATH, 'utf8');
  
  // Build new COMBINE_DATA array
  const dataLines = BBL_PROSPECTS.map(p => {
    const r = results[p.name];
    const h = r.height ? '"' + r.height + '"' : 'null';
    const fmt = v => (v !== null && v !== undefined) ? v : 'null';
    return `  {name:"${p.name}",pos:"${p.pos}",school:"${p.school}",rank:${p.rank},height:${h},weight:${fmt(r.weight)},forty:${fmt(r.forty)},vertical:${fmt(r.vertical)},broad:${fmt(r.broad)},bench:${fmt(r.bench)},cone:${fmt(r.cone)},shuttle:${fmt(r.shuttle)}}`;
  });
  const newDataBlock = 'const COMBINE_DATA = [\n' + dataLines.join(',\n') + '\n];';
  
  // Replace the COMBINE_DATA block in HTML
  const dataRegex = /const COMBINE_DATA = \[[\s\S]*?\];/;
  const newHtml = html.replace(dataRegex, newDataBlock);

  // Update the "last updated" timestamp
  const now = new Date();
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const dateStr = `${months[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()} ${now.getHours()}:${String(now.getMinutes()).padStart(2,'0')}`;
  const updatedHtml = newHtml.replace(
    /Last updated: <span id="lastUpdated">.*?<\/span>/,
    `Last updated: <span id="lastUpdated">${dateStr}</span>`
  );
  
  fs.writeFileSync(OUTPUT_PATH, updatedHtml);

  // ---- Write src/combineData.json ----
  const combineJson = {};
  BBL_PROSPECTS.forEach(p => {
    const r = results[p.name];
    // Only include prospects with at least some data
    const hasData = r.height || r.weight || r.forty || r.vertical || r.broad || r.bench || r.cone || r.shuttle || r.arms || r.hands || r.wingspan;
    if (!hasData) return;
    const key = normName(p.name) + '|' + p.school.toLowerCase().trim();
    // Compute Speed Score: (weight * 200) / (forty^4) — weight-adjusted speed metric
    const speedScore = (r.weight && r.forty) ? Math.round((r.weight * 200) / Math.pow(r.forty, 4) * 100) / 100 : null;
    combineJson[key] = {
      height: r.heightInches || null,
      weight: r.weight || null,
      forty: r.forty || null,
      vertical: r.vertical || null,
      broad: r.broad || null,
      bench: r.bench || null,
      cone: r.cone || null,
      shuttle: r.shuttle || null,
      arms: r.arms || null,
      hands: r.hands || null,
      wingspan: r.wingspan || null,
      speedScore: speedScore,
    };
  });
  fs.writeFileSync(COMBINE_JSON_PATH, JSON.stringify(combineJson, null, 2));
  console.log(`\n📊 Wrote ${Object.keys(combineJson).length} prospects to ${COMBINE_JSON_PATH}`);

  // Stats
  const filled = BBL_PROSPECTS.filter(p => {
    const r = results[p.name];
    return r.forty || r.vertical || r.broad || r.bench || r.cone || r.shuttle;
  }).length;
  const withMeasure = BBL_PROSPECTS.filter(p => {
    const r = results[p.name];
    return r.height || r.weight;
  }).length;

  console.log(`\n✅ Done! Updated ${OUTPUT_PATH}`);
  console.log(`   📊 ${filled} prospects with athletic testing data`);
  console.log(`   📏 ${withMeasure} prospects with height/weight`);
  console.log(`   📦 ${BBL_PROSPECTS.length} total prospects\n`);
  
  if (filled === 0) {
    console.log('   💡 No combine drill results yet — this is normal before the combine starts.');
    console.log('   💡 Run this script again once drills begin (Thu Feb 26).\n');
    console.log('   💡 You can also add data manually via combine-manual.csv:');
    console.log('      name,pos,school,height,weight,forty,vertical,broad,bench,cone,shuttle');
    console.log('      Fernando Mendoza,QB,Indiana,6-5,225,4.78,30,112,,,\n');
  }
}

main().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
