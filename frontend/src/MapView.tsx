import {useEffect,useRef} from "react";import L from "leaflet";import "leaflet/dist/leaflet.css";import {RISK} from "./ui";
export default function MapView({dets=[],selected,onSelect,overlay,onPick,pin,drawPolygon=[],height="100%"}:any){
 const el=useRef<HTMLDivElement>(null),m=useRef<L.Map>(),lg=useRef<L.LayerGroup>(),ov=useRef<L.ImageOverlay>(),pk=useRef<L.CircleMarker>(),area=useRef<L.LayerGroup>(),pickRef=useRef(onPick);
 pickRef.current=onPick;
 useEffect(()=>{const map=L.map(el.current!).setView([18.5525,73.855],15);L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png",{attribution:"Map data © OpenStreetMap contributors, ODbL"}).addTo(map);
  lg.current=L.layerGroup().addTo(map);area.current=L.layerGroup().addTo(map);m.current=map;map.on("click",(e:L.LeafletMouseEvent)=>pickRef.current?.(e.latlng));return()=>{map.remove()}},[]);
 useEffect(()=>{lg.current!.clearLayers();dets.forEach((d:any)=>L.geoJSON(d.polygon,{style:{color:RISK[d.risk_level],weight:d.id==selected?4:2,fillOpacity:.4}}).on("click",()=>onSelect?.(d.id)).addTo(lg.current!))},[dets,selected]);
 useEffect(()=>{ov.current?.remove();if(overlay){ov.current=L.imageOverlay(overlay.url,overlay.bounds,{opacity:.95}).addTo(m.current!);ov.current.bringToBack()}},[overlay?.url]);
 useEffect(()=>{pk.current?.remove();if(pin)pk.current=L.circleMarker(pin,{radius:9,color:"#1D3557",fillOpacity:.8}).addTo(m.current!)},[pin]);
 useEffect(()=>{area.current?.clearLayers();if(drawPolygon.length>1){const points=drawPolygon.map((p:any)=>[p.lat,p.lng] as L.LatLngTuple);if(drawPolygon.length>2)L.polygon(points,{color:"#1D3557",weight:3,fillColor:"#74C69D",fillOpacity:.18,dashArray:"6 5",interactive:false}).addTo(area.current!);else L.polyline(points,{color:"#1D3557",weight:3,dashArray:"6 5",interactive:false}).addTo(area.current!);drawPolygon.forEach((p:any)=>L.circleMarker(p,{radius:4,color:"#1D3557",fillColor:"#fff",fillOpacity:1,weight:2,interactive:false}).addTo(area.current!))}},[drawPolygon]);
 useEffect(()=>{const d=dets.find((x:any)=>x.id==selected);if(d)m.current!.fitBounds(L.geoJSON(d.polygon).getBounds().pad(2))},[selected]);
 return <div ref={el} style={{height}} className="w-full" role="application" aria-label="Map"/>}
export const Legend=()=><div className="flex flex-wrap gap-3 text-xs">{Object.entries(RISK).map(([k,c])=><span key={k} className="flex items-center gap-1"><i style={{background:c}} className="w-3 h-3 inline-block rounded-sm"/>{k}</span>)}</div>;
