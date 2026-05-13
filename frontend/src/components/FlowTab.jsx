import { useState, useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const SPOTS = [
  { id:1,  name:"구포시장 입구",        dong:"구포1동",  lat:35.1972, lng:128.9918, icon:"🏪", tag:"전통시장·어르신",    base:{morning:44.7,afternoon:96.2,evening:68.3,night:14.3}, peak:[12,13,14,15,16,17], demo:"60대 26.2% · 50대 18.9%", src:"구포1동 실측" },
  { id:2,  name:"덕천교차로·덕천역",    dong:"덕천2동",  lat:35.2105, lng:129.0012, icon:"🚇", tag:"환승거점·유세 1순위", base:{morning:45.2,afternoon:93.4,evening:92.6,night:23.4}, peak:[14,15,16,17,18,19], demo:"60대 20.3% · 50대 18.6%", src:"덕천2동 실측" },
  { id:3,  name:"만덕오거리",           dong:"만덕2동",  lat:35.2148, lng:129.0198, icon:"🔀", tag:"교통요충·차량노출",   base:{morning:55.5,afternoon:97.7,evening:85.8,night:17.2}, peak:[12,13,14,15,16,17], demo:"60대 22.1% · 50대 18.0%", src:"만덕2동 보간" },
  { id:4,  name:"구포역 광장",          dong:"구포2동",  lat:35.1935, lng:128.9902, icon:"🚂", tag:"기차·상인층",        base:{morning:59.2,afternoon:98.1,evening:79.1,night:13.1}, peak:[12,13,14,15,16,17], demo:"60대 23.0% · 50대 19.3%", src:"구포2동 실측" },
  { id:5,  name:"만덕역·디지털도서관",  dong:"만덕2동",  lat:35.2181, lng:129.0245, icon:"📚", tag:"학부모·청년층",      base:{morning:55.5,afternoon:97.7,evening:85.8,night:17.2}, peak:[12,13,14,15,16,17], demo:"60대 22.1% · 50대 18.0%", src:"만덕2동 실측" },
  { id:6,  name:"덕천 젊음의 거리",     dong:"덕천3동",  lat:35.2072, lng:129.0048, icon:"🌆", tag:"상권·낮피크",        base:{morning:64.5,afternoon:90.0,evening:75.8,night:28.3}, peak:[10,11,12,13,14,15], demo:"60대 22.8% · 50대 18.3%", src:"덕천3동 실측" },
  { id:7,  name:"만덕2동 아파트단지",   dong:"만덕2동",  lat:35.2192, lng:129.0268, icon:"🏘️", tag:"주거밀집·중장년",    base:{morning:55.5,afternoon:97.7,evening:85.8,night:17.2}, peak:[12,13,14,15,16,17], demo:"60대 22.1% · 50대 18.0%", src:"만덕2동 실측" },
  { id:8,  name:"구포도서관·과학체험관",dong:"구포3동",  lat:35.1912, lng:128.9940, icon:"🔬", tag:"학생·학부모",        base:{morning:50.8,afternoon:95.3,evening:64.8,night:14.2}, peak:[11,12,13,14,15,16], demo:"60대 25.0% · 50대 20.4%", src:"구포3동 실측" },
  { id:9,  name:"덕천1동 행정복지센터", dong:"덕천1동",  lat:35.2128, lng:128.9978, icon:"🏛️", tag:"원도심·소상공인",    base:{morning:58.7,afternoon:97.0,evening:76.1,night:15.6}, peak:[11,12,13,14,15,16], demo:"60대 23.0% · 50대 18.9%", src:"덕천1동 실측" },
  { id:10, name:"신만덕 그린코아 일대", dong:"만덕3동",  lat:35.2215, lng:129.0302, icon:"🏙️", tag:"대단지·저녁피크",    base:{morning:33.6,afternoon:61.7,evening:90.1,night:26.0}, peak:[17,18,19,20,21,22], demo:"60대 21.2% · 50대 17.2%", src:"만덕3동 실측" },
  { id:11, name:"구포2동 강변아파트",   dong:"구포2동",  lat:35.1955, lng:128.9882, icon:"🌊", tag:"수변·환경공약",      base:{morning:59.2,afternoon:98.1,evening:79.1,night:13.1}, peak:[12,13,14,15,16,17], demo:"60대 23.0% · 50대 19.3%", src:"구포2동 실측" },
  { id:12, name:"덕천2·3동 주공아파트", dong:"덕천2동",  lat:35.2088, lng:129.0030, icon:"🏠", tag:"시니어복지",         base:{morning:45.2,afternoon:93.4,evening:92.6,night:23.4}, peak:[14,15,16,17,18,19], demo:"60대 20.3% · 50대 18.6%", src:"덕천2동 실측" },
  { id:13, name:"만덕터널 입구",        dong:"만덕2동",  lat:35.2162, lng:129.0155, icon:"🚦", tag:"교통현안·차량유세",  base:{morning:55.5,afternoon:97.7,evening:85.8,night:17.2}, peak:[12,13,14,15,16,17], demo:"60대 22.1% · 50대 18.0%", src:"만덕2동 보간" },
  { id:14, name:"북구 문화예술회관",    dong:"구포1동",  lat:35.1990, lng:128.9930, icon:"🎭", tag:"문화·여가",          base:{morning:44.7,afternoon:96.2,evening:68.3,night:14.3}, peak:[12,13,14,15,16,17], demo:"60대 26.2% · 50대 18.9%", src:"구포1동 실측" },
  { id:15, name:"구포나루·화명생태공원",dong:"구포2동",  lat:35.2010, lng:128.9862, icon:"🌿", tag:"주말나들이",         base:{morning:59.2,afternoon:98.1,evening:79.1,night:13.1}, peak:[12,13,14,15,16,17], demo:"60대 23.0% · 50대 19.3%", src:"구포2동 실측" },
];

const T = {
  bg:"#070b12", bdr:"#0e2038", bdrS:"#0a1830",
  txt:"#b0c8e0", muted:"#365868", sub:"#5888a0",
  acc:"#00aaff", accBg:"#00101e",
  liveBg:"#001610", liveBdr:"#00e066", liveOff:"#111",
  tBg:"rgba(0,20,50,.45)", tBgH:"rgba(0,70,170,.22)",
  tBdr:"#0a1830", tBdrH:"#003c9a",
  sBg:"rgba(5,12,26,.7)", sBgH:"rgba(0,50,150,.18)",
  sBdr:"#0a1830", sBdrH:"#003c9a",
  bar:"#0a1830", tabA:"#061625",
  srcBg:"rgba(0,36,90,.45)", srcTxt:"#3080c8",
  foot:"#050910", scT:"#070b12", scB:"#0e2038",
};

function slotOf(h){ return h>=6&&h<12?"morning":h>=12&&h<17?"afternoon":h>=17&&h<22?"evening":"night"; }
function calcD(sp,h){ const b=sp.base[slotOf(h)],pk=sp.peak.includes(h)?8:0,n=Math.sin(sp.id*5.3+h*2.7)*4; return Math.min(100,Math.max(5,b+pk+n)); }
function dc(d){ if(d>=75)return{hex:"#ff2020",rgb:"255,32,32",label:"매우 혼잡"}; if(d>=55)return{hex:"#ff8c00",rgb:"255,140,0",label:"혼잡"}; if(d>=35)return{hex:"#e0c000",rgb:"224,192,0",label:"보통"}; return{hex:"#00cc66",rgb:"0,204,102",label:"한산"}; }
function fh(h){ return (h<12?"오전":"오후")+" "+(h===0?12:h>12?h-12:h)+"시"; }

export default function FlowTab(){
  const [hour,setHour]    = useState(new Date().getHours());
  const [sel,setSel]      = useState(null);
  const [live,setLive]    = useState(true);
  const [sort,setSort]    = useState("density");
  const mapRef     = useRef(null);
  const leafRef    = useRef(null);
  const markersRef = useRef({});
  const circlesRef = useRef({});

  const spots  = SPOTS.map(s=>({...s,d:Math.round(calcD(s,hour))}));
  const sorted = [...spots].sort((a,b)=>sort==="density"?b.d-a.d:a.id-b.id);
  const top3   = [...spots].sort((a,b)=>b.d-a.d).slice(0,3);
  const sl     = slotOf(hour);

  // 지도 초기화
  useEffect(()=>{
    if(!mapRef.current || leafRef.current) return;
    const map = L.map(mapRef.current,{
      center:[35.2060,129.0060], zoom:14,
      zoomControl:false, attributionControl:false,
    });
    L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",{maxZoom:19}).addTo(map);
    L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}",{maxZoom:16,opacity:0.18}).addTo(map);
    L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}",{maxZoom:19,opacity:0.4}).addTo(map);
    L.control.zoom({position:"bottomright"}).addTo(map);
    L.control.attribution({position:"bottomleft",prefix:"ESRI Imagery | 부산 빅데이터 웨이브"}).addTo(map);
    leafRef.current = map;
    return()=>{ map.remove(); leafRef.current=null; };
  },[]);

  // 마커 갱신
  useEffect(()=>{
    const map = leafRef.current;
    if(!map) return;
    Object.values(markersRef.current).forEach(m=>m.remove());
    Object.values(circlesRef.current).forEach(c=>c.remove());
    markersRef.current={};
    circlesRef.current={};

    spots.forEach(sp=>{
      const c=dc(sp.d);
      const isSel=sel===sp.id;
      const r=10+(sp.d/100)*16;

      const glowCircle = L.circle([sp.lat,sp.lng],{
        radius:r*22, color:c.hex, fillColor:c.hex,
        fillOpacity:0.06, opacity:0.2, weight:1,
      }).addTo(map);

      const midCircle = L.circle([sp.lat,sp.lng],{
        radius:r*10, color:c.hex, fillColor:c.hex,
        fillOpacity:0.12, opacity:0.35, weight:1.5,
      }).addTo(map);

      const selBorder = isSel ? "2.5px solid rgba(255,255,255,0.95)" : `1.5px solid rgba(${c.rgb},0.7)`;
      const icon = L.divIcon({
        className:"",
        iconSize:[r*2+4,r*2+4],
        iconAnchor:[r+2,r+2],
        html:`<div style="width:${r*2}px;height:${r*2}px;border-radius:50%;background:radial-gradient(circle,rgba(255,255,255,0.7) 0%,${c.hex} 40%,${c.hex}bb 100%);box-shadow:0 0 ${r*1.5}px rgba(${c.rgb},0.9),0 0 ${r*3}px rgba(${c.rgb},0.4);border:${selBorder};cursor:pointer;"></div><div style="position:absolute;top:-22px;left:50%;transform:translateX(-50%);background:rgba(2,6,16,0.92);border:1px solid rgba(${c.rgb},0.6);border-radius:3px;padding:2px 6px;font-size:10px;font-weight:bold;color:${c.hex};font-family:monospace;white-space:nowrap;pointer-events:none;">${sp.d}%</div>`,
      });

      const marker = L.marker([sp.lat,sp.lng],{icon,zIndexOffset:isSel?1000:sp.d})
        .addTo(map)
        .on("click",()=>setSel(prev=>prev===sp.id?null:sp.id));

      markersRef.current[sp.id]=marker;
      circlesRef.current[sp.id+"_g"]=glowCircle;
      circlesRef.current[sp.id+"_m"]=midCircle;
    });
  },[hour,sel]);

  // 선택 시 flyTo
  useEffect(()=>{
    if(!sel||!leafRef.current) return;
    const sp=SPOTS.find(s=>s.id===sel);
    if(sp) leafRef.current.flyTo([sp.lat,sp.lng],15,{duration:0.8});
  },[sel]);

  // LIVE 타이머
  useEffect(()=>{
    if(!live) return;
    const id=setInterval(()=>setHour(new Date().getHours()),30000);
    return()=>clearInterval(id);
  },[live]);

  const selSpot = sel ? spots.find(s=>s.id===sel) : null;

  return(
    <div style={{display:"flex",flexDirection:"column",height:"100vh",background:T.bg,fontFamily:"JetBrains Mono,Courier New,monospace",color:T.txt}}>

      {/* 헤더 */}
      <div style={{background:"linear-gradient(180deg,#091525,#070b12)",borderBottom:`1px solid ${T.bdr}`,padding:"9px 16px",display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:8,flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <div style={{width:7,height:7,borderRadius:"50%",background:live?"#00e066":T.muted,boxShadow:live?"0 0 6px #00e066":"none",animation:live?"blink 2s infinite":"none"}}/>
          <span style={{fontSize:10,color:T.muted,letterSpacing:"2px",textTransform:"uppercase"}}>북구갑 유동인구 분석 시스템</span>
          <span style={{fontSize:9,padding:"2px 7px",borderRadius:3,border:`1px solid ${live?T.liveBdr:T.bdr}`,background:live?T.liveBg:T.liveOff,color:live?T.liveBdr:T.muted}}>{live?"● LIVE":"MANUAL"}</span>
          <span style={{fontSize:8,padding:"2px 7px",borderRadius:3,background:T.srcBg,color:T.srcTxt}}>DATA: 부산 빅데이터 웨이브 통신사 2019~2025</span>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
          <div style={{display:"flex",alignItems:"center",gap:7}}>
            <span style={{fontSize:9,color:T.muted}}>시각</span>
            <input type="range" min={0} max={23} value={hour} onChange={e=>{setHour(+e.target.value);setLive(false);}} style={{width:100,accentColor:T.acc,cursor:"pointer"}}/>
            <span style={{fontSize:12,fontWeight:"bold",color:T.acc,minWidth:60}}>{fh(hour)}</span>
          </div>
          <button onClick={()=>{setLive(true);setHour(new Date().getHours());}} style={{background:live?T.liveBg:T.accBg,border:`1px solid ${live?T.liveBdr:T.acc}`,color:live?T.liveBdr:T.acc,padding:"3px 10px",borderRadius:4,fontSize:9,cursor:"pointer"}}>{live?"● LIVE":"LIVE 전환"}</button>
        </div>
      </div>

      {/* 바디 */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 290px",flex:1,minHeight:0}}>

        {/* 지도 */}
        <div style={{position:"relative",overflow:"hidden"}}>
          <div ref={mapRef} style={{width:"100%",height:"100%"}}/>

          {/* 시각 오버레이 */}
          <div style={{position:"absolute",top:10,left:10,zIndex:1000,background:"rgba(3,7,16,0.92)",border:`1px solid ${T.bdr}`,borderRadius:5,padding:"5px 10px",pointerEvents:"none"}}>
            <span style={{fontSize:15,fontWeight:"bold",color:T.acc,letterSpacing:2}}>{fh(hour)}</span>
            <span style={{fontSize:9,color:T.muted,marginLeft:6}}>{{morning:"오전",afternoon:"오후",evening:"저녁",night:"심야"}[sl]} 시간대</span>
          </div>

          {/* 범례 */}
          <div style={{position:"absolute",bottom:30,left:10,zIndex:1000,background:"rgba(3,7,16,0.92)",border:`1px solid ${T.bdr}`,borderRadius:5,padding:"8px 11px",pointerEvents:"none"}}>
            <div style={{fontSize:8,color:T.muted,marginBottom:5,letterSpacing:2}}>DENSITY</div>
            {[{c:"#ff2020",l:"매우 혼잡 75%+"},{c:"#ff8c00",l:"혼잡 55~74%"},{c:"#e0c000",l:"보통 35~54%"},{c:"#00cc66",l:"한산 ~34%"}].map(x=>(
              <div key={x.l} style={{display:"flex",alignItems:"center",gap:5,marginBottom:3}}>
                <div style={{width:8,height:8,borderRadius:"50%",background:x.c,boxShadow:`0 0 4px ${x.c}`}}/>
                <span style={{fontSize:9,color:T.sub}}>{x.l}</span>
              </div>
            ))}
          </div>

          {/* 선택 카드 */}
          {selSpot&&(()=>{
            const c=dc(selSpot.d);
            return(
              <div style={{position:"absolute",bottom:30,right:10,zIndex:1000,background:"rgba(3,7,16,0.96)",border:`1px solid ${c.hex}`,borderRadius:6,padding:"10px 13px",minWidth:200,boxShadow:`0 0 24px rgba(${c.rgb},.3)`}}>
                <div style={{fontSize:12,fontWeight:"bold",color:"#ddf0ff",marginBottom:3}}>{selSpot.icon} {selSpot.name}</div>
                <div style={{fontSize:10,color:c.hex,marginBottom:2}}>밀집도 {selSpot.d}% — {c.label}</div>
                <div style={{height:2,background:"#0a1830",borderRadius:1,marginBottom:6}}>
                  <div style={{height:"100%",borderRadius:1,width:`${selSpot.d}%`,background:`linear-gradient(90deg,${c.hex}55,${c.hex})`,transition:"width .5s"}}/>
                </div>
                <div style={{fontSize:9,color:T.muted,marginBottom:1}}>📌 {selSpot.tag}</div>
                <div style={{fontSize:9,color:T.muted,marginBottom:1}}>👥 {selSpot.demo}</div>
                <div style={{fontSize:8,color:T.muted,marginBottom:4}}>피크: {selSpot.peak.slice(0,4).map(fh).join(" / ")}</div>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div style={{fontSize:8,color:T.srcTxt,background:T.srcBg,padding:"1px 5px",borderRadius:2}}>📡 {selSpot.src}</div>
                  <button onClick={()=>setSel(null)} style={{background:"none",border:"none",color:T.muted,fontSize:12,cursor:"pointer"}}>✕</button>
                </div>
              </div>
            );
          })()}
        </div>

        {/* 우측 패널 */}
        <div style={{background:T.bg,borderLeft:`1px solid ${T.bdr}`,display:"flex",flexDirection:"column",overflow:"hidden"}}>
          <div style={{padding:"10px 13px",borderBottom:`1px solid ${T.bdrS}`}}>
            <div style={{fontSize:8,color:T.muted,letterSpacing:2,marginBottom:7}}>▶ TOP 유세 권고 지점</div>
            {top3.map((s,i)=>{
              const c=dc(s.d),isSel=sel===s.id;
              return(
                <div key={s.id} onClick={()=>setSel(s.id)} style={{display:"flex",alignItems:"center",gap:8,padding:"5px 7px",borderRadius:4,marginBottom:3,background:isSel?T.tBgH:T.tBg,border:`1px solid ${isSel?T.tBdrH:T.tBdr}`,cursor:"pointer",transition:"all .15s"}}>
                  <div style={{width:18,height:18,borderRadius:"50%",background:["#b88000","#607888","#885010"][i],display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:"bold",color:"#fff",flexShrink:0}}>{i+1}</div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:10,color:T.txt,fontWeight:"bold",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{s.icon} {s.name}</div>
                    <div style={{fontSize:8,color:T.muted}}>{s.dong}</div>
                  </div>
                  <div style={{fontSize:11,fontWeight:"bold",color:c.hex,flexShrink:0}}>{s.d}%</div>
                </div>
              );
            })}
          </div>
          <div style={{display:"flex",borderBottom:`1px solid ${T.bdrS}`}}>
            {[["density","밀집도순"],["id","번호순"]].map(([v,l])=>(
              <button key={v} onClick={()=>setSort(v)} style={{flex:1,padding:5,fontSize:9,background:sort===v?T.tabA:"transparent",border:"none",borderBottom:`2px solid ${sort===v?T.acc:"transparent"}`,color:sort===v?T.acc:T.muted,cursor:"pointer",transition:"all .2s"}}>{l}</button>
            ))}
          </div>
          <div style={{flex:1,overflowY:"auto",padding:6}} className="fs">
            {sorted.map(sp=>{
              const c=dc(sp.d),isSel=sel===sp.id;
              return(
                <div key={sp.id} onClick={()=>setSel(isSel?null:sp.id)} style={{padding:"7px 8px",marginBottom:3,borderRadius:4,background:isSel?T.sBgH:T.sBg,border:`1px solid ${isSel?T.sBdrH:T.sBdr}`,cursor:"pointer",transition:"all .15s"}}>
                  <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:3}}>
                    <div style={{width:7,height:7,borderRadius:"50%",background:c.hex,boxShadow:`0 0 4px ${c.hex}`,flexShrink:0}}/>
                    <span style={{fontSize:10,color:T.txt,fontWeight:"bold",flex:1}}>{sp.icon} {sp.name}</span>
                    <span style={{fontSize:10,fontWeight:"bold",color:c.hex}}>{sp.d}%</span>
                  </div>
                  <div style={{height:2,background:T.bar,borderRadius:1,marginBottom:3}}>
                    <div style={{height:"100%",borderRadius:1,width:`${sp.d}%`,background:`linear-gradient(90deg,${c.hex}55,${c.hex})`,transition:"width .5s ease"}}/>
                  </div>
                  <div style={{display:"flex",justifyContent:"space-between"}}>
                    <span style={{fontSize:8,color:T.muted}}>{sp.dong}</span>
                    <span style={{fontSize:8,color:c.hex}}>{c.label}</span>
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{padding:"8px 12px",borderTop:`1px solid ${T.bdrS}`,background:T.foot}}>
            <div style={{fontSize:8,color:T.muted,letterSpacing:1,marginBottom:5}}>시간대별 유세 전략 (실측 피크 기반)</div>
            {[{s:"morning",l:"오전 06~11시",t:"덕천역·구포역 출근길"},{s:"afternoon",l:"오후 12~16시",t:"구포시장·전 지역 최대 피크"},{s:"evening",l:"저녁 17~21시",t:"덕천역·만덕3동 귀가 집중"},{s:"night",l:"심야 22시~",t:"유세 종료 권고"}].map(x=>(
              <div key={x.s} style={{display:"flex",gap:6,marginBottom:2,opacity:sl===x.s?1:0.35,transition:"opacity .3s"}}>
                <span style={{fontSize:8,color:sl===x.s?T.acc:T.muted,minWidth:72}}>{x.l}</span>
                <span style={{fontSize:8,color:T.sub}}>{x.t}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <style>{`
        @keyframes blink{0%,100%{opacity:1}50%{opacity:.28}}
        .fs::-webkit-scrollbar{width:3px}
        .fs::-webkit-scrollbar-track{background:${T.scT}}
        .fs::-webkit-scrollbar-thumb{background:${T.scB};border-radius:2px}
        .leaflet-container{background:#06090f!important}
        .leaflet-control-attribution{font-size:7px!important;background:rgba(3,8,16,.75)!important;color:#3a6070!important}
        .leaflet-control-attribution a{color:#2a5060!important}
        .leaflet-control-zoom a{background:rgba(3,8,16,.9)!important;color:#5888a0!important;border-color:#0e2038!important}
      `}</style>
    </div>
  );
}
