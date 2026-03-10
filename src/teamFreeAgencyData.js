import ARI from "../agents/output/free-agency/ARI.json";
import ATL from "../agents/output/free-agency/ATL.json";
import BAL from "../agents/output/free-agency/BAL.json";
import BUF from "../agents/output/free-agency/BUF.json";
import CAR from "../agents/output/free-agency/CAR.json";
import CHI from "../agents/output/free-agency/CHI.json";
import CIN from "../agents/output/free-agency/CIN.json";
import CLE from "../agents/output/free-agency/CLE.json";
import DAL from "../agents/output/free-agency/DAL.json";
import DEN from "../agents/output/free-agency/DEN.json";
import DET from "../agents/output/free-agency/DET.json";
import GB from "../agents/output/free-agency/GB.json";
import HOU from "../agents/output/free-agency/HOU.json";
import IND from "../agents/output/free-agency/IND.json";
import JAX from "../agents/output/free-agency/JAX.json";
import KC from "../agents/output/free-agency/KC.json";
import LAC from "../agents/output/free-agency/LAC.json";
import LAR from "../agents/output/free-agency/LAR.json";
import LV from "../agents/output/free-agency/LV.json";
import MIA from "../agents/output/free-agency/MIA.json";
import MIN from "../agents/output/free-agency/MIN.json";
import NE from "../agents/output/free-agency/NE.json";
import NO from "../agents/output/free-agency/NO.json";
import NYG from "../agents/output/free-agency/NYG.json";
import NYJ from "../agents/output/free-agency/NYJ.json";
import PHI from "../agents/output/free-agency/PHI.json";
import PIT from "../agents/output/free-agency/PIT.json";
import SEA from "../agents/output/free-agency/SEA.json";
import SF from "../agents/output/free-agency/SF.json";
import TB from "../agents/output/free-agency/TB.json";
import TEN from "../agents/output/free-agency/TEN.json";
import WSH from "../agents/output/free-agency/WSH.json";
import { ABBR_TO_TEAM } from "./teamConfig.js";

const ALL = {ARI,ATL,BAL,BUF,CAR,CHI,CIN,CLE,DAL,DEN,DET,GB,HOU,IND,JAX,KC,LAC,LAR,LV,MIA,MIN,NE,NO,NYG,NYJ,PHI,PIT,SEA,SF,TB,TEN,WSH};

const TEAM_FREE_AGENCY = {};
Object.entries(ALL).forEach(([abbr, data]) => {
  TEAM_FREE_AGENCY[ABBR_TO_TEAM[abbr]] = data.team_page_additions || {};
});

export default TEAM_FREE_AGENCY;
