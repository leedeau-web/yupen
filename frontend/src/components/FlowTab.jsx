import { useState, useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.heat";

// ─────────────────────────────────────────────────────────────
// 1. 동별 실측 데이터 (부산 빅데이터 웨이브 2019~2025 통신사)
//    로그 정규화(10~90), 동간 실제 격차 반영
// ─────────────────────────────────────────────────────────────
const DONG_DATA = {
  "구포1동": { color:"#60a5fa", labelPos:[35.2045,129.0020], heatPos:[35.2087,129.0038],
    base:{morning:50,afternoon:66,evening:59,night:38}, peak:[12,13,14,15,16],
    demo:"60대 26.2% · 50대 18.9%",
    strategy:{ morning:"구포시장 인근 출근 유동인구 공략", afternoon:"전통시장·문화예술회관 방문객 집중", evening:"귀가 동선 구포역 일대", night:"유세 종료 권고" } },
  "구포2동": { color:"#a78bfa", labelPos:[35.1990,128.9940], heatPos:[35.2012,128.9991],
    base:{morning:50,afternoon:59,evening:55,night:35}, peak:[12,13,14,15,16],
    demo:"60대 23.0% · 50대 19.3%",
    strategy:{ morning:"구포역 출근 환승객", afternoon:"행정복지센터·나루 일대 방문객", evening:"귀가 구포역 광장", night:"유세 종료 권고" } },
  "구포3동": { color:"#22d3ee", labelPos:[35.1930,129.0020], heatPos:[35.1941,128.9961],
    base:{morning:30,afternoon:41,evening:35,night:20}, peak:[11,12,13,14,15],
    demo:"60대 25.0% · 50대 20.4%",
    strategy:{ morning:"도서관 개관 전 학부모 동선", afternoon:"도서관·과학체험관 방문 피크", evening:"소규모 상권 귀가길", night:"유세 종료 권고" } },
  "덕천1동": { color:"#fbbf24", labelPos:[35.2155,129.0130], heatPos:[35.2124,129.0166],
    base:{morning:47,afternoon:55,evening:52,night:36}, peak:[11,12,13,14,15],
    demo:"60대 23.0% · 50대 18.9%",
    strategy:{ morning:"주민센터 민원 방문객 오전 집중", afternoon:"상업지구 점심·오후 유동", evening:"만덕터널 방향 귀가 동선", night:"유세 종료 권고" } },
  "덕천2동": { color:"#4ade80", labelPos:[35.2140,129.0030], heatPos:[35.2106,129.0054],
    base:{morning:76,afternoon:89,evening:89,night:68}, peak:[14,15,16,18,19],
    demo:"60대 20.3% · 50대 18.6%",
    strategy:{ morning:"덕천역 출근 환승객 최대 집중", afternoon:"북구 최대 유동 피크 — 유세 1순위", evening:"퇴근 귀가 덕천역 환승 집중", night:"심야에도 상권 유동 유지" } },
  "덕천3동": { color:"#f87171", labelPos:[35.2055,129.0130], heatPos:[35.2091,129.0074],
    base:{morning:17,afternoon:20,evening:19,night:13}, peak:[9,10,11,12,14],
    demo:"60대 22.8% · 50대 18.3%",
    strategy:{ morning:"오전 상권 초입 유동", afternoon:"젊음의거리 점심 방문객", evening:"상권 저녁 유동", night:"유세 종료 권고" } },
  "만덕2동": { color:"#c084fc", labelPos:[35.2100,129.0420], heatPos:[35.2126,129.0382],
    base:{morning:44,afternoon:51,evening:50,night:37}, peak:[12,13,14,15,16],
    demo:"60대 22.1% · 50대 18.0%",
    strategy:{ morning:"만덕터널 출근 차량 유세", afternoon:"도서관·사거리 방문객 오후 피크", evening:"아파트 귀가 동선", night:"유세 종료 권고" } },
  "만덕3동": { color:"#2dd4bf", labelPos:[35.2080,129.0230], heatPos:[35.2083,129.0303],
    base:{morning:36,afternoon:41,evening:45,night:34}, peak:[17,18,19,20,21],
    demo:"60대 21.2% · 50대 17.2%",
    strategy:{ morning:"아파트 단지 출근 동선", afternoon:"그린코아 단지 오후 유동", evening:"저녁 피크 — 귀가 아파트 입구", night:"유세 종료 권고" } },
};

// ─────────────────────────────────────────────────────────────
// 2. 유세 포인트 (혼잡도 없음 — 위치·성격 정보만)
// ─────────────────────────────────────────────────────────────
const SPOTS = [
  { id:1,  dong:"구포1동", lat:35.2087173, lng:129.0037777, icon:"🏪", name:"구포시장 입구",        tag:"전통시장·어르신 밀집" },
  { id:2,  dong:"덕천2동", lat:35.2105565, lng:129.0053895, icon:"🚇", name:"덕천교차로·덕천역",    tag:"북구 최대 환승 거점" },
  { id:3,  dong:"만덕2동", lat:35.212648,  lng:129.038169,  icon:"🔀", name:"만덕사거리",           tag:"만덕 교통 요충" },
  { id:4,  dong:"구포2동", lat:35.2058965, lng:128.9967412, icon:"🚂", name:"구포역 광장",          tag:"KTX·도시철도 환승" },
  { id:5,  dong:"만덕2동", lat:35.207321,  lng:129.037949,  icon:"📚", name:"만덕도서관",           tag:"학부모·청년층 집결" },
  { id:6,  dong:"덕천3동", lat:35.2090673, lng:129.0074052, icon:"🌆", name:"덕천 젊음의 거리",     tag:"20~40대 저녁 상권" },
  { id:7,  dong:"만덕2동", lat:35.2077475, lng:129.0340276, icon:"🏘️", name:"백양 디 이스트",      tag:"대단지 아파트 주거" },
  { id:8,  dong:"구포3동", lat:35.1940556, lng:128.9961356, icon:"📖", name:"구포도서관",           tag:"학생·학부모 오후 집결" },
  { id:9,  dong:"덕천1동", lat:35.2124107, lng:129.0166461, icon:"🏛️", name:"덕천1동 주민센터",    tag:"민원·소상공인 거점" },
  { id:10, dong:"만덕3동", lat:35.208328,  lng:129.030312,  icon:"🏙️", name:"만덕 그린코아아파트", tag:"대단지 베드타운" },
  { id:11, dong:"구포2동", lat:35.2011875, lng:128.9991465, icon:"🏢", name:"구포2동 행정복지센터", tag:"행정·복지 민원" },
  { id:12, dong:"덕천2동", lat:35.2091035, lng:129.0132495, icon:"🏠", name:"덕천 주공아파트",      tag:"시니어·장기거주" },
  { id:13, dong:"만덕2동", lat:35.2119925, lng:129.057504,  icon:"🚦", name:"만덕터널 입구",        tag:"출퇴근 차량 유세" },
  { id:14, dong:"구포1동", lat:35.2134491, lng:129.0054681, icon:"🎭", name:"북구 문화예술회관",    tag:"문화·여가 행사" },
  { id:15, dong:"구포1동", lat:35.212447,  lng:128.999273, icon:"🌉", name:"금빛노을브릿지",       tag:"낙동강 랜드마크·나들이" },
  { id:18, dong:"만덕2동", lat:35.214364,  lng:129.031414,  icon:"🏫", name:"만덕초등학교 앞",      tag:"학부모·어린이 등하교" }];

// 동별 추천 동선 (시간대별)
const ROUTES = {
  "구포1동": {
    morning: [{id:1,note:"시장 상인·어르신"},{id:14,note:"문화예술회관 앞"}],
    afternoon:[{id:1,note:"시장 오후 피크 방문객"},{id:14,note:"문화 프로그램"}],
    evening:  [{id:14,note:"저녁 행사 관람객"},{id:1,note:"시장 저녁 귀가"}],
    night:    [],
  },
  "구포2동": {
    morning: [{id:4,note:"KTX·지하철 출근 환승"},{id:11,note:"행정복지센터 민원"},{id:15,note:"나루 산책 출근"}],
    afternoon:[{id:11,note:"오후 민원 방문객"},{id:4,note:"역 광장 상인"},{id:15,note:"나루 나들이"}],
    evening:  [{id:4,note:"퇴근 귀가 환승"},{id:15,note:"저녁 산책"},{id:11,note:"주민 귀가 동선"}],
    night:    [],
  },
  "구포3동": {
    morning: [{id:8,note:"도서관 개관 전 학부모"}],
    afternoon:[{id:8,note:"오후 도서관 피크"}],
    evening:  [{id:8,note:"저녁 반납 귀가"}],
    night:    [],
  },
  "덕천1동": {
    morning: [{id:9,note:"주민센터 오전 민원"}],
    afternoon:[{id:9,note:"오후 민원·상담"}],
    evening:  [{id:9,note:"귀가 동선 주민센터"}],
    night:    [],
  },
  "덕천2동": {
    morning: [{id:2,note:"출근 환승객 최대 피크"},{id:12,note:"주공아파트 출근"}],
    afternoon:[{id:2,note:"덕천역 낮 유동 최대"},{id:12,note:"아파트 단지 방문"}],
    evening:  [{id:2,note:"퇴근 귀가 환승 집중"},{id:12,note:"아파트 귀가"}],
    night:    [{id:2,note:"심야 환승 잔여 유동"}],
  },
  "덕천3동": {
    morning: [{id:6,note:"상권 오전 유동"}],
    afternoon:[{id:6,note:"젊음의거리 점심 상권"}],
    evening:  [{id:6,note:"저녁 상권 20~40대"}],
    night:    [],
  },
  "만덕2동": {
    morning: [{id:13,note:"터널 출근 차량 유세"},{id:3,note:"사거리 오전 유동"},{id:5,note:"도서관 등교 학부모"}],
    afternoon:[{id:5,note:"도서관 오후 피크"},{id:3,note:"사거리 낮 유동"},{id:7,note:"아파트 단지 오후"}],
    evening:  [{id:13,note:"터널 귀가 차량"},{id:7,note:"아파트 귀가"},{id:3,note:"사거리 저녁 유동"}],
    night:    [],
  },
  "만덕3동": {
    morning: [{id:18,note:"초등학교 등교 학부모"},{id:10,note:"그린코아 출근"}],
    afternoon:[{id:10,note:"단지 오후 유동"},{id:18,note:"하교 학부모"}],
    evening:  [{id:10,note:"저녁 피크 아파트 귀가"},{id:18,note:"저녁 학원 귀가"}],
    night:    [],
  },
};

const THEMES = {
  light:{bg:"#f8fafc",panelBg:"#ffffff",headerBg:"linear-gradient(180deg,#ffffff,#f8fafc)",bdr:"#e2e8f0",txt:"#1e293b",muted:"#94a3b8",sub:"#64748b",acc:"#3b82f6",accBg:"#eff6ff",liveBg:"#f0fdf4",liveBdr:"#22c55e",liveOff:"#f1f5f9",tBg:"#f8fafc",tBgH:"#eff6ff",tBdr:"#e2e8f0",tBdrH:"#3b82f6",sBg:"#f8fafc",sBgH:"#eff6ff",sBdr:"#e2e8f0",sBdrH:"#3b82f6",bar:"#e2e8f0",tabA:"#eff6ff",togBg:"#f1f5f9",togTxt:"#475569",trkBg:"#cbd5e1",knob:"#64748b",knobSh:"none",foot:"#f8fafc",scT:"#f8fafc",scB:"#cbd5e1",mapOverlay:0.05,cardBg:"rgba(255,255,255,0.95)",badge:"#f0f9ff",badgeTxt:"#0284c7"},
  dark:{bg:"#070b12",panelBg:"#0a1018",headerBg:"linear-gradient(180deg,#0d1520,#070b12)",bdr:"#1e3448",txt:"#cbd5e1",muted:"#4a6070",sub:"#6888a0",acc:"#38bdf8",accBg:"#0c1e30",liveBg:"#022012",liveBdr:"#4ade80",liveOff:"#111820",tBg:"rgba(0,20,50,.5)",tBgH:"rgba(14,80,180,.22)",tBdr:"#162030",tBdrH:"#1d4ed8",sBg:"rgba(5,12,26,.7)",sBgH:"rgba(14,60,160,.2)",sBdr:"#162030",sBdrH:"#1d4ed8",bar:"#162030",tabA:"#0a1a2e",togBg:"#0d1828",togTxt:"#94a3b8",trkBg:"#1e3a5a",knob:"#38bdf8",knobSh:"0 0 6px #38bdf8",foot:"#060910",scT:"#070b12",scB:"#1e3448",mapOverlay:0.22,cardBg:"rgba(7,14,24,0.95)",badge:"rgba(0,40,100,.4)",badgeTxt:"#38bdf8"},
};

function slotOf(h){return h>=6&&h<12?"morning":h>=12&&h<17?"afternoon":h>=17&&h<22?"evening":"night";}
function getDongDensity(name,h){const d=DONG_DATA[name];if(!d)return 20;return d.base[slotOf(h)];}
function dc(v){if(v>=80)return{hex:"#ef4444",rgb:"239,68,68",label:"매우 혼잡"};if(v>=65)return{hex:"#f97316",rgb:"249,115,22",label:"혼잡"};if(v>=48)return{hex:"#eab308",rgb:"234,179,8",label:"보통"};if(v>=30)return{hex:"#22c55e",rgb:"34,197,94",label:"한산"};return{hex:"#6366f1",rgb:"99,102,241",label:"매우 한산"};}
function fh(h){return(h<12?"오전":"오후")+" "+(h===0?12:h>12?h-12:h)+"시";}

export default function FlowTab(){
  const [hour,setHour]=useState(new Date().getHours());
  const [live,setLive]=useState(true);
  const [theme,setTheme]=useState("light");
  const [selDong,setSelDong]=useState(null);
  const [selSpotId,setSelSpotId]=useState(null);
  const [showRoute,setShowRoute]=useState(false);
  const [panelTab,setPanelTab]=useState("dong");
  const mapRef=useRef(null),leafRef=useRef(null),heatRef=useRef(null),darkLayRef=useRef(null);
  const spotMarkersRef=useRef({}),dongLabelsRef=useRef([]),routeLinesRef=useRef([]);
  const T=THEMES[theme],dk=theme==="dark";
  const sl=slotOf(hour);

  const dongDensities=Object.entries(DONG_DATA).map(([name,d])=>({name,...d,density:getDongDensity(name,hour)})).sort((a,b)=>b.density-a.density);
  const selDongData=selDong?DONG_DATA[selDong]:null;
  const selDongDensity=selDong?getDongDensity(selDong,hour):null;
  const selDongSpots=selDong?SPOTS.filter(s=>s.dong===selDong):[];
  const routeSpots=selDong&&ROUTES[selDong]?(ROUTES[selDong][sl]||[]).map(r=>({...SPOTS.find(s=>s.id===r.id),...r})).filter(Boolean):[];
  const selSpot=selSpotId?SPOTS.find(s=>s.id===selSpotId):null;

  useEffect(()=>{
    if(!mapRef.current||leafRef.current)return;
    const map=L.map(mapRef.current,{center:[35.2070,129.0060],zoom:14,zoomControl:false,attributionControl:false});
    L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",{maxZoom:19}).addTo(map);
    const dl=L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}",{maxZoom:16,opacity:THEMES.light.mapOverlay}).addTo(map);
    darkLayRef.current=dl;
    L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}",{maxZoom:19,opacity:0.5}).addTo(map);
    L.control.zoom({position:"bottomright"}).addTo(map);
    L.control.attribution({position:"bottomleft",prefix:"ESRI | 빅데이터웨이브 2019~2025"}).addTo(map);
    leafRef.current=map;
    return()=>{map.remove();leafRef.current=null;};
  },[]);

  useEffect(()=>{if(darkLayRef.current)darkLayRef.current.setOpacity(T.mapOverlay);},[theme]);

  useEffect(()=>{
    const map=leafRef.current;if(!map)return;
    if(heatRef.current){if(Array.isArray(heatRef.current)){heatRef.current.forEach(l=>l.remove());}else{heatRef.current.remove();}heatRef.current=null;}
    // 동별 밀집도 — 열상카메라 페이드아웃 (바깥 극히 흐림→중심 진함)
    Object.entries(DONG_DATA).forEach(([name,d])=>{
      const density=getDongDensity(name,hour);
      const c=dc(density);
      // 덕천3동은 겹침 방지용 작게
      const baseR = name==="덕천3동" ? 300 + density*4 : 550 + density*7;
      [
        {scale:1.00, opacity:0.03},  // 바깥 — 거의 안보임
        {scale:0.70, opacity:0.07},  // 중간 바깥
        {scale:0.45, opacity:0.14},  // 중간
        {scale:0.22, opacity:0.30},  // 중심
      ].forEach(({scale,opacity})=>{
        const l=L.circle(d.heatPos,{
          radius:baseR*scale, color:"transparent", weight:0,
          fillColor:c.hex, fillOpacity:opacity,
        }).addTo(map);
        if(!heatRef.current) heatRef.current=[];
        heatRef.current.push(l);
      });
    });
    dongLabelsRef.current.forEach(m=>m.remove());dongLabelsRef.current=[];
    Object.entries(DONG_DATA).forEach(([name,d])=>{
      const density=getDongDensity(name,hour),c=dc(density),isSel=selDong===name;
      const m=L.marker(d.labelPos,{icon:L.divIcon({className:"",iconSize:[80,28],iconAnchor:[40,14],html:`<div style="text-align:center;pointer-events:auto;cursor:pointer;"><div style="width:52px;height:52px;border-radius:50%;background:${c.hex};opacity:0.82;display:flex;flex-direction:column;align-items:center;justify-content:center;box-shadow:0 0 0 6px ${c.hex}44,0 0 0 12px ${c.hex}22,0 0 0 20px ${c.hex}0a"><span style="font-size:10px;font-weight:800;color:#fff;white-space:nowrap;line-height:1.3;text-shadow:0 1px 2px rgba(0,0,0,0.3)">${name}</span><span style="font-size:9px;font-weight:700;color:rgba(255,255,255,0.92);line-height:1.2;">${density}%</span></div></div>`}),interactive:true,zIndexOffset:-500}).addTo(map).on("click",()=>{setSelDong(p=>p===name?null:name);setSelSpotId(null);setShowRoute(false);setPanelTab("dong");});
      dongLabelsRef.current.push(m);
    });
    Object.values(spotMarkersRef.current).forEach(m=>m.remove());spotMarkersRef.current={};
    SPOTS.forEach(sp=>{
      const isSel=selSpotId===sp.id,isDongSel=selDong===sp.dong;
      const m=L.marker([sp.lat,sp.lng],{icon:L.divIcon({className:"",iconSize:[32,32],iconAnchor:[16,16],html:`<div style="width:28px;height:28px;border-radius:50%;background:${isDongSel?"rgba(255,255,255,0.95)":"rgba(255,255,255,0.7)"};border:2px solid ${isDongSel?"#fff":"rgba(255,255,255,0.5)"};display:flex;align-items:center;justify-content:center;font-size:14px;box-shadow:0 2px 8px rgba(0,0,0,0.4)${isSel?",0 0 0 3px rgba(255,255,255,0.8)":""};cursor:pointer;">${sp.icon}</div>`}),zIndexOffset:isSel?1000:100}).addTo(map).on("click",()=>{setSelSpotId(p=>p===sp.id?null:sp.id);setSelDong(sp.dong);setPanelTab("dong");});
      spotMarkersRef.current[sp.id]=m;
    });
  },[hour,selDong,selSpotId,theme]);

  useEffect(()=>{
    const map=leafRef.current;if(!map)return;
    routeLinesRef.current.forEach(l=>l.remove());routeLinesRef.current=[];
    if(showRoute&&routeSpots.length>1){
      const coords=routeSpots.map(s=>[s.lat,s.lng]);
      routeLinesRef.current.push(L.polyline(coords,{color:"#facc15",weight:3,opacity:0.9,dashArray:"8,5"}).addTo(map));
      routeSpots.forEach((s,i)=>{
        routeLinesRef.current.push(L.marker([s.lat,s.lng],{icon:L.divIcon({className:"",iconSize:[22,22],iconAnchor:[11,11],html:`<div style="width:20px;height:20px;border-radius:50%;background:#facc15;border:2px solid #fff;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:800;color:#000;box-shadow:0 2px 6px rgba(0,0,0,0.4);">${i+1}</div>`}),zIndexOffset:2000}).addTo(map));
      });
      map.flyToBounds(L.latLngBounds(coords),{padding:[40,40],duration:0.7});
    }
  },[showRoute,selDong,hour]);

  useEffect(()=>{if(!live)return;const id=setInterval(()=>setHour(new Date().getHours()),30000);return()=>clearInterval(id);},[live]);

  return(
    <div style={{display:"flex",flexDirection:"column",height:"100vh",background:T.bg,fontFamily:"-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif",color:T.txt,transition:"background .25s"}}>
      <div style={{background:T.headerBg,borderBottom:`1px solid ${T.bdr}`,padding:"10px 20px",display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:10,flexShrink:0,boxShadow:"0 1px 3px rgba(0,0,0,0.06)"}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:8,height:8,borderRadius:"50%",background:live?T.liveBdr:T.muted,boxShadow:live?`0 0 6px ${T.liveBdr}`:"none",animation:live?"blink 2s infinite":"none"}}/>
          <span style={{fontSize:13,fontWeight:600,color:T.txt}}>유동인구 밀집도</span>
          <span style={{fontSize:10,padding:"2px 8px",borderRadius:12,border:`1px solid ${live?T.liveBdr:T.bdr}`,background:live?T.liveBg:T.liveOff,color:live?T.liveBdr:T.muted,fontWeight:500}}>{live?"● LIVE":"MANUAL"}</span>
          <span style={{fontSize:10,padding:"2px 8px",borderRadius:12,background:T.badge,color:T.badgeTxt,fontWeight:500}}>빅데이터 웨이브 2019~2025</span>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:12,flexWrap:"wrap"}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <span style={{fontSize:11,color:T.muted}}>시각</span>
            <input type="range" min={0} max={23} value={hour} onChange={e=>{setHour(+e.target.value);setLive(false);}} style={{width:100,accentColor:T.acc,cursor:"pointer"}}/>
            <span style={{fontSize:13,fontWeight:700,color:T.acc,minWidth:62}}>{fh(hour)}</span>
          </div>
          <button onClick={()=>{setLive(true);setHour(new Date().getHours());}} style={{padding:"5px 12px",borderRadius:8,border:`1px solid ${live?T.liveBdr:T.acc}`,background:live?T.liveBg:T.accBg,color:live?T.liveBdr:T.acc,fontSize:11,fontWeight:600,cursor:"pointer"}}>{live?"● LIVE":"LIVE 전환"}</button>
          <button onClick={()=>setTheme(t=>t==="light"?"dark":"light")} style={{display:"flex",alignItems:"center",gap:6,padding:"5px 12px",borderRadius:8,border:`1px solid ${T.bdr}`,background:T.togBg,cursor:"pointer"}}>
            <div style={{position:"relative",width:28,height:16,background:T.trkBg,borderRadius:8}}>
              <div style={{position:"absolute",top:2,left:dk?14:2,width:12,height:12,borderRadius:"50%",background:T.knob,boxShadow:T.knobSh,transition:"left .25s"}}/>
            </div>
            <span style={{fontSize:11,color:T.togTxt,fontWeight:500}}>{dk?"🌙 Dark":"☀️ Light"}</span>
          </button>
        </div>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 310px",flex:1,minHeight:0}}>
        <div style={{position:"relative",overflow:"hidden"}}>
          <div ref={mapRef} style={{width:"100%",height:"100%"}}/>
          <div style={{position:"absolute",top:12,left:12,zIndex:1000,background:T.cardBg,border:`1px solid ${T.bdr}`,borderRadius:10,padding:"8px 14px",boxShadow:"0 2px 8px rgba(0,0,0,0.12)",backdropFilter:"blur(8px)",pointerEvents:"none"}}>
            <div style={{fontSize:18,fontWeight:700,color:T.acc}}>{fh(hour)}</div>
            <div style={{fontSize:10,color:T.muted,marginTop:1}}>{{morning:"오전",afternoon:"오후",evening:"저녁",night:"심야"}[sl]} 시간대</div>
          </div>
          <div style={{position:"absolute",bottom:32,left:12,zIndex:1000,background:T.cardBg,border:`1px solid ${T.bdr}`,borderRadius:10,padding:"10px 14px",boxShadow:"0 2px 8px rgba(0,0,0,0.12)",backdropFilter:"blur(8px)",pointerEvents:"none"}}>
            <div style={{fontSize:9,color:T.muted,marginBottom:6,fontWeight:600,letterSpacing:1,textTransform:"uppercase"}}>동별 유동인구 밀집도</div>
            {[{c:"#ef4444",l:"매우 혼잡  80%+"},{c:"#f97316",l:"혼잡      65~79%"},{c:"#eab308",l:"보통      48~64%"},{c:"#22c55e",l:"한산      30~47%"},{c:"#6366f1",l:"매우 한산  ~29%"}].map(x=>(
              <div key={x.l} style={{display:"flex",alignItems:"center",gap:6,marginBottom:3}}>
                <div style={{width:8,height:8,borderRadius:"50%",background:x.c}}/>
                <span style={{fontSize:9,color:T.sub,fontFamily:"monospace"}}>{x.l}</span>
              </div>
            ))}
            <div style={{marginTop:6,paddingTop:6,borderTop:`1px solid ${T.bdr}`,fontSize:9,color:T.muted}}>📍 마커 = 유세 포인트 ({SPOTS.length}개)</div>
          </div>
          {selSpot&&(
            <div style={{position:"absolute",bottom:32,right:10,zIndex:1000,background:T.cardBg,border:`1px solid ${T.bdr}`,borderRadius:12,padding:"14px 16px",minWidth:210,boxShadow:"0 4px 20px rgba(0,0,0,0.15)",backdropFilter:"blur(8px)"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                <div style={{fontSize:13,fontWeight:700,color:T.txt}}>{selSpot.icon} {selSpot.name}</div>
                <button onClick={()=>setSelSpotId(null)} style={{background:"none",border:"none",color:T.muted,fontSize:14,cursor:"pointer",padding:0}}>✕</button>
              </div>
              <div style={{fontSize:11,color:T.sub,marginBottom:4}}>📌 {selSpot.tag}</div>
              <div style={{fontSize:10,color:T.muted,marginBottom:10}}>🗺 {selSpot.dong}</div>
              <button onClick={()=>{setSelDong(selSpot.dong);setPanelTab("route");setShowRoute(true);}} style={{width:"100%",padding:"7px",borderRadius:8,background:T.accBg,border:`1px solid ${T.acc}`,color:T.acc,fontSize:11,fontWeight:600,cursor:"pointer"}}>이 동 추천 동선 보기 →</button>
            </div>
          )}
        </div>

        <div style={{background:T.panelBg,borderLeft:`1px solid ${T.bdr}`,display:"flex",flexDirection:"column",overflow:"hidden",transition:"background .25s"}}>
          <div style={{display:"flex",borderBottom:`1px solid ${T.bdr}`,flexShrink:0}}>
            {[["dong","동별 현황"],["route","추천 동선"]].map(([v,l])=>(
              <button key={v} onClick={()=>setPanelTab(v)} style={{flex:1,padding:"10px 4px",fontSize:11,fontWeight:panelTab===v?600:400,background:panelTab===v?T.tabA:"transparent",border:"none",borderBottom:`2px solid ${panelTab===v?T.acc:"transparent"}`,color:panelTab===v?T.acc:T.muted,cursor:"pointer",transition:"all .2s"}}>{l}</button>
            ))}
          </div>

          {panelTab==="dong"&&(
            <>
              {selDong&&selDongData?(
                <div style={{padding:"14px 16px",borderBottom:`1px solid ${T.bdr}`,flexShrink:0}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      <div style={{width:10,height:10,borderRadius:"50%",background:selDongData.color}}/>
                      <span style={{fontSize:13,fontWeight:700,color:T.txt}}>{selDong}</span>
                    </div>
                    <button onClick={()=>{setSelDong(null);setSelSpotId(null);}} style={{background:"none",border:"none",color:T.muted,fontSize:12,cursor:"pointer"}}>✕</button>
                  </div>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                    <span style={{fontSize:26,fontWeight:800,color:dc(selDongDensity).hex}}>{selDongDensity}%</span>
                    <span style={{fontSize:11,color:dc(selDongDensity).hex,background:`rgba(${dc(selDongDensity).rgb},0.1)`,padding:"2px 8px",borderRadius:20,fontWeight:600}}>{dc(selDongDensity).label}</span>
                  </div>
                  <div style={{height:4,background:T.bar,borderRadius:2,marginBottom:8,overflow:"hidden"}}>
                    <div style={{height:"100%",borderRadius:2,width:`${selDongDensity}%`,background:`linear-gradient(90deg,${dc(selDongDensity).hex}88,${dc(selDongDensity).hex})`,transition:"width .5s"}}/>
                  </div>
                  <div style={{fontSize:10,color:T.sub,marginBottom:4}}>👥 {selDongData.demo}</div>
                  <div style={{fontSize:10,color:T.acc,marginBottom:10,fontStyle:"italic"}}>💡 {selDongData.strategy[sl]}</div>
                  <div style={{display:"flex",gap:2,alignItems:"flex-end",height:36,marginBottom:4}}>
                    {Object.entries(selDongData.base).map(([slot,val])=>{
                      const labels={morning:"오전",afternoon:"오후",evening:"저녁",night:"심야"};
                      const isActive=slot===sl;
                      return(<div key={slot} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
                        <div style={{width:"100%",height:`${val*0.36}px`,background:isActive?dc(val).hex:T.bar,borderRadius:2,transition:"height .3s"}}/>
                        <span style={{fontSize:7,color:isActive?dc(val).hex:T.muted,fontWeight:isActive?700:400}}>{labels[slot]}</span>
                      </div>);
                    })}
                  </div>
                  <div style={{fontSize:10,color:T.muted,marginTop:10,marginBottom:4,fontWeight:600}}>유세 포인트 ({selDongSpots.length}개)</div>
                  {selDongSpots.map(sp=>(
                    <div key={sp.id} onClick={()=>setSelSpotId(p=>p===sp.id?null:sp.id)} style={{display:"flex",alignItems:"center",gap:8,padding:"5px 8px",borderRadius:8,marginBottom:3,background:selSpotId===sp.id?T.sBgH:T.sBg,border:`1px solid ${selSpotId===sp.id?T.sBdrH:T.sBdr}`,cursor:"pointer"}}>
                      <span style={{fontSize:13}}>{sp.icon}</span>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:10,fontWeight:600,color:T.txt,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{sp.name}</div>
                        <div style={{fontSize:9,color:T.muted}}>{sp.tag}</div>
                      </div>
                    </div>
                  ))}
                  <button onClick={()=>{setPanelTab("route");setShowRoute(true);}} style={{width:"100%",marginTop:8,padding:"7px",borderRadius:8,background:T.accBg,border:`1px solid ${T.acc}`,color:T.acc,fontSize:11,fontWeight:600,cursor:"pointer"}}>📍 {selDong} 추천 동선 보기 →</button>
                </div>
              ):(
                <div style={{padding:"16px",borderBottom:`1px solid ${T.bdr}`,flexShrink:0}}>
                  <div style={{fontSize:11,color:T.muted,textAlign:"center",padding:"8px 0"}}>지도에서 동 이름을 클릭하세요</div>
                </div>
              )}
              <div style={{flex:1,overflowY:"auto",padding:"8px"}} className="fs">
                <div style={{fontSize:10,fontWeight:600,color:T.muted,padding:"4px 8px 6px"}}>현재 시간대 동별 밀집도 순위</div>
                {dongDensities.map((d,i)=>{
                  const c=dc(d.density),isSel=selDong===d.name;
                  return(<div key={d.name} onClick={()=>{setSelDong(p=>p===d.name?null:d.name);setSelSpotId(null);}} style={{padding:"8px 10px",marginBottom:4,borderRadius:10,background:isSel?T.sBgH:T.sBg,border:`1px solid ${isSel?T.sBdrH:T.sBdr}`,cursor:"pointer",transition:"all .15s"}}>
                    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                      <span style={{fontSize:10,color:T.muted,width:14,textAlign:"right",flexShrink:0}}>{i+1}</span>
                      <div style={{width:8,height:8,borderRadius:"50%",background:d.color,flexShrink:0}}/>
                      <span style={{fontSize:11,fontWeight:600,color:T.txt,flex:1}}>{d.name}</span>
                      <span style={{fontSize:13,fontWeight:700,color:c.hex}}>{d.density}%</span>
                    </div>
                    <div style={{height:3,background:T.bar,borderRadius:2,overflow:"hidden",marginLeft:22}}>
                      <div style={{height:"100%",borderRadius:2,width:`${d.density}%`,background:`linear-gradient(90deg,${c.hex}66,${c.hex})`,transition:"width .6s"}}/>
                    </div>
                    <div style={{display:"flex",justifyContent:"space-between",marginTop:3,marginLeft:22}}>
                      <span style={{fontSize:9,color:T.muted}}>{SPOTS.filter(s=>s.dong===d.name).length}개 유세포인트</span>
                      <span style={{fontSize:9,fontWeight:500,color:c.hex}}>{c.label}</span>
                    </div>
                  </div>);
                })}
              </div>
            </>
          )}

          {panelTab==="route"&&(
            <div style={{flex:1,overflowY:"auto",display:"flex",flexDirection:"column"}}>
              <div style={{padding:"12px 16px",borderBottom:`1px solid ${T.bdr}`,flexShrink:0}}>
                <div style={{fontSize:10,color:T.muted,marginBottom:6,fontWeight:600}}>동 선택</div>
                <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                  {Object.keys(DONG_DATA).map(name=>{
                    const density=getDongDensity(name,hour),c=dc(density);
                    return(<button key={name} onClick={()=>{setSelDong(name);setShowRoute(true);}} style={{padding:"4px 8px",borderRadius:20,border:`1px solid ${selDong===name?c.hex:T.bdr}`,background:selDong===name?`rgba(${c.rgb},0.15)`:T.sBg,color:selDong===name?c.hex:T.sub,fontSize:10,fontWeight:selDong===name?700:400,cursor:"pointer"}}>{name}</button>);
                  })}
                </div>
              </div>
              {selDong&&selDongData?(
                <div style={{flex:1,padding:"14px 16px",overflowY:"auto"}} className="fs">
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                    <div>
                      <div style={{fontSize:14,fontWeight:700,color:T.txt}}>{selDong} 추천 동선</div>
                      <div style={{fontSize:10,color:T.muted,marginTop:2}}>{{morning:"오전 06~11시",afternoon:"오후 12~16시",evening:"저녁 17~21시",night:"심야 22시~"}[sl]} 기준</div>
                    </div>
                    <button onClick={()=>setShowRoute(p=>!p)} style={{padding:"5px 10px",borderRadius:8,border:`1px solid ${showRoute?"#facc15":T.bdr}`,background:showRoute?"rgba(250,204,21,0.15)":"transparent",color:showRoute?"#facc15":T.muted,fontSize:10,fontWeight:600,cursor:"pointer"}}>{showRoute?"지도선 on":"지도선 off"}</button>
                  </div>
                  <div style={{fontSize:10,color:T.acc,background:T.accBg,padding:"8px 10px",borderRadius:8,marginBottom:12,fontStyle:"italic"}}>💡 {selDongData.strategy[sl]}</div>
                  {routeSpots.length>0?(
                    <>
                      <div style={{fontSize:10,color:T.muted,fontWeight:600,marginBottom:8}}>추천 순서</div>
                      {routeSpots.map((sp,i)=>(
                        <div key={sp.id} style={{display:"flex",gap:10,marginBottom:10,alignItems:"flex-start"}}>
                          <div style={{width:22,height:22,borderRadius:"50%",background:"#facc15",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:800,color:"#000",flexShrink:0}}>{i+1}</div>
                          <div style={{flex:1,padding:"8px 10px",background:T.sBg,borderRadius:10,border:`1px solid ${T.sBdr}`}}>
                            <div style={{fontSize:11,fontWeight:600,color:T.txt,marginBottom:2}}>{sp.icon} {sp.name}</div>
                            <div style={{fontSize:10,color:T.acc}}>{sp.note}</div>
                            <div style={{fontSize:9,color:T.muted,marginTop:2}}>{sp.tag}</div>
                          </div>
                        </div>
                      ))}
                    </>
                  ):(
                    <div style={{textAlign:"center",padding:"24px 0",color:T.muted,fontSize:12}}>심야 시간대는 유세를 종료하세요</div>
                  )}
                  <div style={{marginTop:12,paddingTop:12,borderTop:`1px solid ${T.bdr}`}}>
                    <div style={{fontSize:10,color:T.muted,fontWeight:600,marginBottom:8}}>전체 유세 포인트</div>
                    {SPOTS.filter(s=>s.dong===selDong).map(sp=>(
                      <div key={sp.id} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 8px",borderRadius:8,marginBottom:3,background:T.sBg,border:`1px solid ${T.sBdr}`}}>
                        <span style={{fontSize:12}}>{sp.icon}</span>
                        <div style={{flex:1}}>
                          <div style={{fontSize:10,fontWeight:600,color:T.txt}}>{sp.name}</div>
                          <div style={{fontSize:9,color:T.muted}}>{sp.tag}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ):(
                <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",color:T.muted,fontSize:12}}>위에서 동을 선택해주세요</div>
              )}
            </div>
          )}

          <div style={{padding:"10px 16px",borderTop:`1px solid ${T.bdr}`,background:T.foot,flexShrink:0}}>
            <div style={{fontSize:10,fontWeight:600,color:T.muted,marginBottom:6}}>시간대별 유세 전략</div>
            {[{s:"morning",l:"오전 06~11시",t:"덕천역·구포역 출근길"},{s:"afternoon",l:"오후 12~16시",t:"시장·도서관·복지센터"},{s:"evening",l:"저녁 17~21시",t:"덕천역 귀가·아파트 입구"},{s:"night",l:"심야 22시~",t:"유세 종료 권고"}].map(x=>(
              <div key={x.s} style={{display:"flex",gap:8,marginBottom:3,opacity:sl===x.s?1:0.38,transition:"opacity .3s"}}>
                <span style={{fontSize:9,fontWeight:sl===x.s?600:400,color:sl===x.s?T.acc:T.muted,minWidth:74,flexShrink:0}}>{x.l}</span>
                <span style={{fontSize:9,color:T.sub}}>{x.t}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <style>{`@keyframes blink{0%,100%{opacity:1}50%{opacity:.3}}.fs::-webkit-scrollbar{width:4px}.fs::-webkit-scrollbar-track{background:${T.scT}}.fs::-webkit-scrollbar-thumb{background:${T.scB};border-radius:2px}.leaflet-container{background:#c8d8e8!important}.leaflet-control-attribution{font-size:8px!important;background:rgba(255,255,255,0.7)!important;}`}</style>
    </div>
  );
}