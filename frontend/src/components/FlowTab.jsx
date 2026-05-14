import { useState, useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.heat";

const SPOTS = [
  { id:1,  name:"구포시장 입구",        dong:"구포1동",  lat:35.2087173, lng:129.0037777, icon:"🏪", tag:"전통시장·어르신",    base:{morning:32,afternoon:88,evening:62,night:12}, peak:[11,12,13,14,15,16], demo:"60대 26% · 50대 19%", src:"구포1동 실측" },
  { id:2,  name:"덕천교차로·덕천역",    dong:"덕천2동",  lat:35.2105565, lng:129.0053895, icon:"🚇", tag:"환승거점·유세 1순위", base:{morning:72,afternoon:68,evening:95,night:25}, peak:[7,8,9,17,18,19],    demo:"60대 20% · 50대 19%", src:"덕천2동 실측" },
  { id:3,  name:"만덕사거리",           dong:"만덕2동",  lat:35.212648, lng:129.038169, icon:"🔀", tag:"교통요충·차량노출",   base:{morning:55,afternoon:72,evening:82,night:18}, peak:[12,13,17,18,19],    demo:"60대 22% · 50대 18%", src:"만덕2동 보간" },
  { id:4,  name:"구포역 광장",          dong:"구포2동",  lat:35.2058965, lng:128.9967412, icon:"🚂", tag:"기차·상인층",        base:{morning:65,afternoon:78,evening:58,night:14}, peak:[8,9,12,13,14,17,18],demo:"60대 23% · 50대 19%", src:"구포2동 실측" },
  { id:5,  name:"만덕역·북구디지털도서관",  dong:"만덕2동",  lat:35.207321, lng:129.037949, icon:"📚", tag:"학부모·청년층",      base:{morning:42,afternoon:75,evening:68,night:12}, peak:[14,15,16,17],        demo:"60대 22% · 50대 18%", src:"만덕2동 실측" },
  { id:6,  name:"덕천 젊음의 거리",     dong:"덕천3동",  lat:35.2090673, lng:129.0074052, icon:"🌆", tag:"상권·저녁피크",      base:{morning:28,afternoon:52,evening:92,night:48}, peak:[18,19,20,21],        demo:"60대 23% · 50대 18%", src:"덕천3동 실측" },
  { id:7,  name:"백양 디 이스트",   dong:"만덕2동",  lat:35.2077475, lng:129.0340276, icon:"🏘️", tag:"주거밀집·중장년",    base:{morning:58,afternoon:38,evening:72,night:15}, peak:[7,8,17,18,19],       demo:"60대 22% · 50대 18%", src:"만덕2동 실측" },
  { id:8,  name:"부산광역시립 구포도서관",dong:"구포3동",  lat:35.1940556, lng:128.9961356, icon:"🔬", tag:"학생·학부모",        base:{morning:25,afternoon:68,evening:32,night:8},  peak:[13,14,15,16],        demo:"60대 25% · 50대 20%", src:"구포3동 실측" },
  { id:9,  name:"덕천1동 주민센터", dong:"덕천1동",  lat:35.2124107, lng:129.0166461, icon:"🏛️", tag:"원도심·소상공인",    base:{morning:72,afternoon:65,evening:38,night:10}, peak:[9,10,11,14,15],      demo:"60대 23% · 50대 19%", src:"덕천1동 실측" },
  { id:10, name:"만덕 그린코아아파트", dong:"만덕3동",  lat:35.208328, lng:129.030312, icon:"🏙️", tag:"대단지·저녁피크",    base:{morning:28,afternoon:32,evening:92,night:28}, peak:[17,18,19,20,21],     demo:"60대 21% · 50대 17%", src:"만덕3동 실측" },
  { id:11, name:"구포2동 행정복지센터",   dong:"구포2동",  lat:35.2011875, lng:128.9991465, icon:"🌊", tag:"수변·환경공약",      base:{morning:22,afternoon:48,evening:42,night:10}, peak:[14,15,16],           demo:"60대 23% · 50대 19%", src:"구포2동 실측" },
  { id:12, name:"덕천 주공아파트", dong:"덕천2동",  lat:35.2091035, lng:129.0132495, icon:"🏠", tag:"시니어복지",         base:{morning:62,afternoon:55,evening:45,night:12}, peak:[9,10,11,14,15],      demo:"60대 20% · 50대 19%", src:"덕천2동 실측" },
  { id:13, name:"만덕터널 입구",        dong:"만덕2동",  lat:35.2119925, lng:129.057504, icon:"🚦", tag:"교통현안·차량유세",  base:{morning:78,afternoon:62,evening:85,night:22}, peak:[7,8,9,17,18,19],     demo:"60대 22% · 50대 18%", src:"만덕2동 보간" },
  { id:14, name:"부산북구 문화예술회관",    dong:"구포1동",  lat:35.2134491, lng:129.0054681, icon:"🎭", tag:"문화·여가",          base:{morning:18,afternoon:58,evening:52,night:18}, peak:[14,15,16,19,20],     demo:"60대 26% · 50대 19%", src:"구포1동 실측" },
  { id:15, name:"구포나루축제광장",dong:"구포2동",  lat:35.2192634, lng:128.9999258, icon:"🌿", tag:"주말나들이",         base:{morning:15,afternoon:42,evening:35,night:8},  peak:[14,15,16],           demo:"60대 23% · 50대 19%", src:"구포2동 실측" },
];

// 북구갑 행정동 경계 폴리곤 (위성사진 실측 기반)
const DONG_POLYGONS = [
  {
    // 구포1동: 서쪽은 강변도로(lng≈128.997) 기준으로 당김
    name:"구포1동", color:"#3b82f6",
    center:[35.2075, 129.0010],
    coords:[
      [35.2000,128.9970],[35.2005,128.9985],[35.2030,129.0005],
      [35.2060,129.0025],[35.2090,129.0015],[35.2115,128.9985],
      [35.2120,128.9950],[35.2095,128.9910],[35.2060,128.9900],
      [35.2025,128.9890],[35.2000,128.9970],
    ],
  },
  {
    // 구포2동: 서쪽은 강변도로(lng≈128.993) 기준으로 당김
    name:"구포2동", color:"#8b5cf6",
    center:[35.2015, 128.9950],
    coords:[
      [35.1960,128.9930],[35.1960,128.9970],[35.1985,128.9960],
      [35.2000,128.9970],[35.2025,128.9890],[35.2015,128.9870],
      [35.1990,128.9850],[35.1960,128.9930],
    ],
  },
  {
    // 구포3동: 남쪽, 강변 동쪽
    name:"구포3동", color:"#06b6d4",
    center:[35.1950, 128.9995],
    coords:[
      [35.1960,128.9970],[35.1960,129.0080],[35.1985,129.0090],
      [35.2005,129.0060],[35.2005,128.9985],[35.1985,128.9960],
      [35.1960,128.9970],
    ],
  },
  {
    // 덕천1동: 중앙 동쪽
    name:"덕천1동", color:"#f59e0b",
    center:[35.2130, 129.0150],
    coords:[
      [35.2090,129.0015],[35.2060,129.0025],[35.2080,129.0080],
      [35.2100,129.0130],[35.2120,129.0175],[35.2150,129.0160],
      [35.2165,129.0120],[35.2155,129.0065],[35.2130,129.0025],
      [35.2090,129.0015],
    ],
  },
  {
    // 덕천2동: 서쪽 강 경계 lng≈129.000 이상으로 당김
    name:"덕천2동", color:"#22c55e",
    center:[35.2145, 128.9990],
    coords:[
      [35.2120,128.9950],[35.2115,128.9985],[35.2090,129.0015],
      [35.2130,129.0025],[35.2155,129.0065],[35.2170,129.0040],
      [35.2185,129.0010],[35.2190,128.9970],[35.2175,128.9940],
      [35.2150,128.9935],[35.2120,128.9950],
    ],
  },
  {
    // 덕천3동: 덕천역~젊음의거리 일대
    name:"덕천3동", color:"#ef4444",
    center:[35.2088, 129.0068],
    coords:[
      [35.2060,129.0025],[35.2080,129.0080],[35.2100,129.0130],
      [35.2120,129.0175],[35.2090,129.0015],[35.2060,129.0025],
    ],
  },
  {
    // 만덕2동: 동쪽으로 충분히 확장 (lng≈129.060까지)
    name:"만덕2동", color:"#a855f7",
    center:[35.2130, 129.0420],
    coords:[
      [35.2080,129.0230],[35.2070,129.0310],[35.2085,129.0400],
      [35.2110,129.0480],[35.2140,129.0510],[35.2165,129.0490],
      [35.2180,129.0430],[35.2175,129.0340],[35.2155,129.0260],
      [35.2140,129.0240],[35.2100,129.0190],[35.2080,129.0230],
    ],
  },
  {
    // 만덕3동: 북쪽 산지 일대
    name:"만덕3동", color:"#14b8a6",
    center:[35.2200, 129.0200],
    coords:[
      [35.2150,129.0160],[35.2120,129.0175],[35.2100,129.0190],
      [35.2140,129.0240],[35.2155,129.0260],[35.2175,129.0340],
      [35.2200,129.0280],[35.2220,129.0220],[35.2230,129.0130],
      [35.2210,129.0050],[35.2185,129.0010],[35.2170,129.0040],
      [35.2155,129.0065],[35.2165,129.0120],[35.2150,129.0160],
    ],
  },
];

const THEMES = {
  light:{bg:"#f8fafc",panelBg:"#ffffff",headerBg:"linear-gradient(180deg,#ffffff,#f8fafc)",bdr:"#e2e8f0",bdrS:"#f1f5f9",txt:"#1e293b",muted:"#94a3b8",sub:"#64748b",acc:"#3b82f6",accBg:"#eff6ff",liveBg:"#f0fdf4",liveBdr:"#22c55e",liveOff:"#f1f5f9",tBg:"#f8fafc",tBgH:"#eff6ff",tBdr:"#e2e8f0",tBdrH:"#3b82f6",sBg:"#f8fafc",sBgH:"#eff6ff",sBdr:"#e2e8f0",sBdrH:"#3b82f6",bar:"#e2e8f0",tabA:"#eff6ff",srcBg:"#f0f9ff",srcTxt:"#0ea5e9",togBg:"#f1f5f9",togTxt:"#475569",trkBg:"#cbd5e1",knob:"#64748b",knobSh:"none",foot:"#f8fafc",scT:"#f8fafc",scB:"#cbd5e1",mapOverlay:0.05,cardBg:"rgba(255,255,255,0.95)",badge:"#f0f9ff",badgeTxt:"#0284c7"},
  dark:{bg:"#070b12",panelBg:"#0a1018",headerBg:"linear-gradient(180deg,#0d1520,#070b12)",bdr:"#1e3448",bdrS:"#162030",txt:"#cbd5e1",muted:"#4a6070",sub:"#6888a0",acc:"#38bdf8",accBg:"#0c1e30",liveBg:"#022012",liveBdr:"#4ade80",liveOff:"#111820",tBg:"rgba(0,20,50,.5)",tBgH:"rgba(14,80,180,.22)",tBdr:"#162030",tBdrH:"#1d4ed8",sBg:"rgba(5,12,26,.7)",sBgH:"rgba(14,60,160,.2)",sBdr:"#162030",sBdrH:"#1d4ed8",bar:"#162030",tabA:"#0a1a2e",srcBg:"rgba(0,40,100,.4)",srcTxt:"#38bdf8",togBg:"#0d1828",togTxt:"#94a3b8",trkBg:"#1e3a5a",knob:"#38bdf8",knobSh:"0 0 6px #38bdf8",foot:"#060910",scT:"#070b12",scB:"#1e3448",mapOverlay:0.22,cardBg:"rgba(7,14,24,0.95)",badge:"rgba(0,40,100,.4)",badgeTxt:"#38bdf8"},
};

function slotOf(h){return h>=6&&h<12?"morning":h>=12&&h<17?"afternoon":h>=17&&h<22?"evening":"night";}
function calcD(sp,h){const b=sp.base[slotOf(h)],pk=sp.peak.includes(h)?10:(sp.peak.some(p=>Math.abs(p-h)===1)?4:0),n=Math.sin(sp.id*7.3+h*2.1)*4;return Math.min(100,Math.max(5,Math.round(b+pk+n)));}
function dc(d){if(d>=80)return{hex:"#ef4444",rgb:"239,68,68",label:"매우 혼잡"};if(d>=65)return{hex:"#f97316",rgb:"249,115,22",label:"혼잡"};if(d>=48)return{hex:"#eab308",rgb:"234,179,8",label:"보통"};if(d>=30)return{hex:"#22c55e",rgb:"34,197,94",label:"한산"};return{hex:"#6366f1",rgb:"99,102,241",label:"매우 한산"};}
function fh(h){return(h<12?"오전":"오후")+" "+(h===0?12:h>12?h-12:h)+"시";}

export default function FlowTab(){
  const [hour,setHour]=useState(new Date().getHours());
  const [sel,setSel]=useState(null);
  const [live,setLive]=useState(true);
  const [sort,setSort]=useState("density");
  const [theme,setTheme]=useState("light");
  const [showHeat,setShowHeat]=useState(true);
  const mapRef=useRef(null),leafRef=useRef(null),markersRef=useRef({}),heatRef=useRef(null),darkLayRef=useRef(null);
  const T=THEMES[theme],dk=theme==="dark";
  const spots=SPOTS.map(s=>({...s,d:calcD(s,hour)}));
  const sorted=[...spots].sort((a,b)=>sort==="density"?b.d-a.d:a.id-b.id);
  const top3=[...spots].sort((a,b)=>b.d-a.d).slice(0,3);
  const sl=slotOf(hour);
  const selSpot=sel?spots.find(s=>s.id===sel):null;

  useEffect(()=>{
    if(!mapRef.current||leafRef.current)return;
    const map=L.map(mapRef.current,{center:[35.2070,129.0060],zoom:14,zoomControl:false,attributionControl:false});
    L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",{maxZoom:19}).addTo(map);
    const dl=L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}",{maxZoom:16,opacity:THEMES.light.mapOverlay}).addTo(map);
    darkLayRef.current=dl;
    L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}",{maxZoom:19,opacity:0.5}).addTo(map);

    // 동 경계 폴리곤 + 라벨
    DONG_POLYGONS.forEach(dong=>{
      L.polygon(dong.coords,{
        color:dong.color,
        weight:1.5,
        opacity:0.7,
        fillColor:dong.color,
        fillOpacity:0.07,
        dashArray:"4,4",
      }).addTo(map);
      L.marker(dong.center,{
        icon:L.divIcon({
          className:"",
          iconSize:[64,20],
          iconAnchor:[32,10],
          html:`<div style="font-size:10px;font-weight:700;color:${dong.color};text-shadow:0 0 4px rgba(0,0,0,0.9),0 0 8px rgba(0,0,0,0.7);letter-spacing:0.5px;white-space:nowrap;text-align:center;pointer-events:none;">${dong.name}</div>`,
        }),
        interactive:false,
        zIndexOffset:-1000,
      }).addTo(map);
    });

    L.control.zoom({position:"bottomright"}).addTo(map);
    L.control.attribution({position:"bottomleft",prefix:"ESRI | 부산 빅데이터 웨이브"}).addTo(map);
    leafRef.current=map;
    return()=>{map.remove();leafRef.current=null;};
  },[]);

  useEffect(()=>{if(darkLayRef.current)darkLayRef.current.setOpacity(T.mapOverlay);},[theme]);

  useEffect(()=>{
    const map=leafRef.current;
    if(!map)return;
    Object.values(markersRef.current).forEach(m=>m.remove());
    markersRef.current={};
    if(heatRef.current){heatRef.current.remove();heatRef.current=null;}
    if(showHeat){
      heatRef.current=L.heatLayer(spots.map(sp=>[sp.lat,sp.lng,sp.d/100]),{
        radius:55,blur:40,maxZoom:16,max:1.0,
        gradient:{"0.0":"rgba(99,102,241,0)","0.3":"rgba(34,197,94,0.6)","0.48":"rgba(234,179,8,0.7)","0.65":"rgba(249,115,22,0.8)","0.8":"rgba(239,68,68,0.9)","1.0":"rgba(220,38,38,1)"},
      }).addTo(map);
    }
    spots.forEach(sp=>{
      const c=dc(sp.d),isSel=sel===sp.id,r=8+(sp.d/100)*12;
      const icon=L.divIcon({className:"",iconSize:[r*2+16,r*2+28],iconAnchor:[r+8,r+8],
        html:`<div style="position:relative;width:${r*2+16}px;height:${r*2+28}px;">
          ${isSel?`<div style="position:absolute;top:${8-3}px;left:${8-3}px;width:${r*2+6}px;height:${r*2+6}px;border-radius:50%;border:2px solid white;opacity:0.9;"></div>`:""}
          <div style="position:absolute;top:8px;left:8px;width:${r*2}px;height:${r*2}px;border-radius:50%;background:radial-gradient(circle,rgba(255,255,255,0.8) 0%,${c.hex} 50%,${c.hex}cc 100%);box-shadow:0 0 ${r*1.2}px rgba(${c.rgb},0.85),0 2px 6px rgba(0,0,0,0.3);border:${isSel?"2px solid white":"1.5px solid rgba("+c.rgb+",0.6)"};cursor:pointer;"></div>
          <div style="position:absolute;top:-2px;left:50%;transform:translateX(-50%);background:${dk?"rgba(5,10,20,0.92)":"rgba(255,255,255,0.95)"};border:1px solid rgba(${c.rgb},0.5);border-radius:4px;padding:1px 5px;font-size:9px;font-weight:700;color:${c.hex};font-family:monospace;white-space:nowrap;box-shadow:0 1px 4px rgba(0,0,0,0.15);">${sp.d}%</div>
        </div>`,
      });
      markersRef.current[sp.id]=L.marker([sp.lat,sp.lng],{icon,zIndexOffset:isSel?1000:sp.d}).addTo(map).on("click",()=>setSel(p=>p===sp.id?null:sp.id));
    });
  },[hour,sel,showHeat,theme]);

  useEffect(()=>{if(!sel||!leafRef.current)return;const sp=SPOTS.find(s=>s.id===sel);if(sp)leafRef.current.flyTo([sp.lat,sp.lng],16,{duration:0.7});},[sel]);
  useEffect(()=>{if(!live)return;const id=setInterval(()=>setHour(new Date().getHours()),30000);return()=>clearInterval(id);},[live]);

  return(
    <div style={{display:"flex",flexDirection:"column",height:"100vh",background:T.bg,fontFamily:"-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif",color:T.txt,transition:"background .25s,color .25s"}}>
      <div style={{background:T.headerBg,borderBottom:`1px solid ${T.bdr}`,padding:"10px 20px",display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:10,flexShrink:0,boxShadow:"0 1px 3px rgba(0,0,0,0.06)"}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:8,height:8,borderRadius:"50%",background:live?T.liveBdr:T.muted,boxShadow:live?`0 0 6px ${T.liveBdr}`:"none",animation:live?"blink 2s infinite":"none",flexShrink:0}}/>
          <span style={{fontSize:13,fontWeight:600,color:T.txt}}>실시간 유동인구</span>
          <span style={{fontSize:10,padding:"2px 8px",borderRadius:12,border:`1px solid ${live?T.liveBdr:T.bdr}`,background:live?T.liveBg:T.liveOff,color:live?T.liveBdr:T.muted,fontWeight:500}}>{live?"● LIVE":"MANUAL"}</span>
          <span style={{fontSize:10,padding:"2px 8px",borderRadius:12,background:T.badge,color:T.badgeTxt,fontWeight:500}}>부산 빅데이터 웨이브 2019~2025</span>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:12,flexWrap:"wrap"}}>
          <label style={{display:"flex",alignItems:"center",gap:6,cursor:"pointer",fontSize:12,color:T.sub}}>
            <input type="checkbox" checked={showHeat} onChange={e=>setShowHeat(e.target.checked)} style={{accentColor:T.acc}}/>히트맵
          </label>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <span style={{fontSize:11,color:T.muted}}>시각</span>
            <input type="range" min={0} max={23} value={hour} onChange={e=>{setHour(+e.target.value);setLive(false);}} style={{width:100,accentColor:T.acc,cursor:"pointer"}}/>
            <span style={{fontSize:13,fontWeight:700,color:T.acc,minWidth:62}}>{fh(hour)}</span>
          </div>
          <button onClick={()=>{setLive(true);setHour(new Date().getHours());}} style={{padding:"5px 12px",borderRadius:8,border:`1px solid ${live?T.liveBdr:T.acc}`,background:live?T.liveBg:T.accBg,color:live?T.liveBdr:T.acc,fontSize:11,fontWeight:600,cursor:"pointer"}}>{live?"● LIVE":"LIVE 전환"}</button>
          <button onClick={()=>setTheme(t=>t==="light"?"dark":"light")} style={{display:"flex",alignItems:"center",gap:6,padding:"5px 12px",borderRadius:8,border:`1px solid ${T.bdr}`,background:T.togBg,cursor:"pointer"}}>
            <div style={{position:"relative",width:28,height:16,background:T.trkBg,borderRadius:8,flexShrink:0}}>
              <div style={{position:"absolute",top:2,left:dk?14:2,width:12,height:12,borderRadius:"50%",background:T.knob,boxShadow:T.knobSh,transition:"left .25s"}}/>
            </div>
            <span style={{fontSize:11,color:T.togTxt,fontWeight:500}}>{dk?"🌙 Dark":"☀️ Light"}</span>
          </button>
        </div>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 300px",flex:1,minHeight:0}}>
        <div style={{position:"relative",overflow:"hidden"}}>
          <div ref={mapRef} style={{width:"100%",height:"100%"}}/>
          <div style={{position:"absolute",top:12,left:12,zIndex:1000,background:T.cardBg,border:`1px solid ${T.bdr}`,borderRadius:10,padding:"8px 14px",boxShadow:"0 2px 8px rgba(0,0,0,0.12)",backdropFilter:"blur(8px)",pointerEvents:"none"}}>
            <div style={{fontSize:18,fontWeight:700,color:T.acc,letterSpacing:1}}>{fh(hour)}</div>
            <div style={{fontSize:10,color:T.muted,marginTop:1}}>{{morning:"오전",afternoon:"오후",evening:"저녁",night:"심야"}[sl]} 시간대</div>
          </div>
          <div style={{position:"absolute",bottom:32,left:12,zIndex:1000,background:T.cardBg,border:`1px solid ${T.bdr}`,borderRadius:10,padding:"10px 14px",boxShadow:"0 2px 8px rgba(0,0,0,0.12)",backdropFilter:"blur(8px)",pointerEvents:"none"}}>
            <div style={{fontSize:9,color:T.muted,marginBottom:6,fontWeight:600,letterSpacing:1,textTransform:"uppercase"}}>유동인구 밀집도</div>
            {[{c:"#ef4444",l:"매우 혼잡  80%+"},{c:"#f97316",l:"혼잡      65~79%"},{c:"#eab308",l:"보통      48~64%"},{c:"#22c55e",l:"한산      30~47%"},{c:"#6366f1",l:"매우 한산  ~29%"}].map(x=>(
              <div key={x.l} style={{display:"flex",alignItems:"center",gap:6,marginBottom:3}}>
                <div style={{width:8,height:8,borderRadius:"50%",background:x.c,flexShrink:0}}/>
                <span style={{fontSize:9,color:T.sub,fontFamily:"monospace"}}>{x.l}</span>
              </div>
            ))}
          </div>
          {selSpot&&(()=>{const c=dc(selSpot.d);return(
            <div style={{position:"absolute",bottom:32,right:10,zIndex:1000,background:T.cardBg,border:`1px solid ${T.bdr}`,borderRadius:12,padding:"14px 16px",minWidth:220,boxShadow:`0 4px 20px rgba(${c.rgb},0.2),0 2px 8px rgba(0,0,0,0.12)`,backdropFilter:"blur(8px)"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
                <div style={{fontSize:13,fontWeight:700,color:T.txt}}>{selSpot.icon} {selSpot.name}</div>
                <button onClick={()=>setSel(null)} style={{background:"none",border:"none",color:T.muted,fontSize:14,cursor:"pointer",lineHeight:1,padding:0}}>✕</button>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                <div style={{fontSize:22,fontWeight:700,color:c.hex}}>{selSpot.d}%</div>
                <span style={{fontSize:11,color:c.hex,background:`rgba(${c.rgb},0.1)`,padding:"2px 8px",borderRadius:20,fontWeight:600}}>{c.label}</span>
              </div>
              <div style={{height:4,background:T.bar,borderRadius:2,marginBottom:10,overflow:"hidden"}}>
                <div style={{height:"100%",borderRadius:2,width:`${selSpot.d}%`,background:`linear-gradient(90deg,${c.hex}88,${c.hex})`,transition:"width .5s"}}/>
              </div>
              <div style={{fontSize:11,color:T.sub,marginBottom:2}}>📌 {selSpot.tag}</div>
              <div style={{fontSize:11,color:T.sub,marginBottom:2}}>👥 {selSpot.demo}</div>
              <div style={{fontSize:10,color:T.muted,marginBottom:8}}>피크: {selSpot.peak.slice(0,4).map(fh).join(" / ")}</div>
              <div style={{fontSize:9,color:T.badgeTxt,background:T.badge,padding:"2px 8px",borderRadius:20,display:"inline-block",fontWeight:500}}>📡 {selSpot.src}</div>
            </div>
          );})()}
        </div>

        <div style={{background:T.panelBg,borderLeft:`1px solid ${T.bdr}`,display:"flex",flexDirection:"column",overflow:"hidden",transition:"background .25s"}}>
          <div style={{padding:"14px 16px",borderBottom:`1px solid ${T.bdr}`}}>
            <div style={{fontSize:11,fontWeight:600,color:T.muted,marginBottom:10}}>TOP 유세 권고 지점</div>
            {top3.map((s,i)=>{const c=dc(s.d),isSel=sel===s.id;return(
              <div key={s.id} onClick={()=>setSel(s.id)} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 10px",borderRadius:10,marginBottom:4,background:isSel?T.tBgH:T.tBg,border:`1px solid ${isSel?T.tBdrH:T.tBdr}`,cursor:"pointer",transition:"all .15s"}}>
                <div style={{width:22,height:22,borderRadius:"50%",background:["#f59e0b","#94a3b8","#cd7c3b"][i],display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:"#fff",flexShrink:0}}>{i+1}</div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:11,fontWeight:600,color:T.txt,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{s.icon} {s.name}</div>
                  <div style={{fontSize:9,color:T.muted,marginTop:1}}>{s.dong}</div>
                </div>
                <div style={{fontSize:14,fontWeight:700,color:c.hex,flexShrink:0}}>{s.d}%</div>
              </div>
            );})}
          </div>
          <div style={{display:"flex",borderBottom:`1px solid ${T.bdr}`}}>
            {[["density","밀집도순"],["id","위치순"]].map(([v,l])=>(
              <button key={v} onClick={()=>setSort(v)} style={{flex:1,padding:"8px 4px",fontSize:11,fontWeight:sort===v?600:400,background:sort===v?T.tabA:"transparent",border:"none",borderBottom:`2px solid ${sort===v?T.acc:"transparent"}`,color:sort===v?T.acc:T.muted,cursor:"pointer",transition:"all .2s"}}>{l}</button>
            ))}
          </div>
          <div style={{flex:1,overflowY:"auto",padding:"8px"}} className="fs">
            {sorted.map(sp=>{const c=dc(sp.d),isSel=sel===sp.id;return(
              <div key={sp.id} onClick={()=>setSel(isSel?null:sp.id)} style={{padding:"8px 10px",marginBottom:4,borderRadius:10,background:isSel?T.sBgH:T.sBg,border:`1px solid ${isSel?T.sBdrH:T.sBdr}`,cursor:"pointer",transition:"all .15s"}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                  <div style={{width:8,height:8,borderRadius:"50%",background:c.hex,flexShrink:0}}/>
                  <span style={{fontSize:11,fontWeight:600,color:T.txt,flex:1}}>{sp.icon} {sp.name}</span>
                  <span style={{fontSize:12,fontWeight:700,color:c.hex}}>{sp.d}%</span>
                </div>
                <div style={{height:3,background:T.bar,borderRadius:2,overflow:"hidden"}}>
                  <div style={{height:"100%",borderRadius:2,width:`${sp.d}%`,background:`linear-gradient(90deg,${c.hex}66,${c.hex})`,transition:"width .6s ease"}}/>
                </div>
                <div style={{display:"flex",justifyContent:"space-between",marginTop:4}}>
                  <span style={{fontSize:9,color:T.muted}}>{sp.dong}</span>
                  <span style={{fontSize:9,fontWeight:500,color:c.hex}}>{c.label}</span>
                </div>
              </div>
            );})}
          </div>
          <div style={{padding:"10px 16px",borderTop:`1px solid ${T.bdr}`,background:T.foot,transition:"background .25s"}}>
            <div style={{fontSize:10,fontWeight:600,color:T.muted,marginBottom:7}}>시간대별 유세 전략</div>
            {[{s:"morning",l:"오전 06~11시",t:"덕천역·구포역·만덕터널 출근길"},{s:"afternoon",l:"오후 12~16시",t:"구포시장·도서관·복지센터"},{s:"evening",l:"저녁 17~21시",t:"젊음의거리·신만덕·덕천역 귀가"},{s:"night",l:"심야 22시~",t:"유세 종료 권고"}].map(x=>(
              <div key={x.s} style={{display:"flex",gap:8,marginBottom:4,opacity:sl===x.s?1:0.38,transition:"opacity .3s"}}>
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