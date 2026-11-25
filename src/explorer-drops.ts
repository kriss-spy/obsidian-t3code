import { Notice, TFile, TFolder } from 'obsidian';
import type T3Plugin from './main';
import { REFERENCE_MIME } from './references';
import { VIEW_TYPE, T3View } from './view';
import { readingReference } from './reading-references';

type Drag = {x:number;y:number;token:string;text?:string;zones:Zone[];ended:boolean;started:boolean;views:Array<{view:T3View;route:string}>};
type Zone = NonNullable<Awaited<ReturnType<T3View['prepareReferenceDrop']>>>;
export function registerExplorerDrops(plugin: T3Plugin, doc: Document) {
  let consumedPointer = false;
  let drag: Drag | null = null;
  const cancel = () => { if (!drag) return; drag.ended=true; for(const zone of drag.zones)zone.cancel();drag=null; };
  plugin.register(cancel);
  const prepareZones = (current: Drag) => {
    if(current.started || current.ended)return;
    current.started=true;
    for(const {view,route} of current.views) {
      void view.prepareReferenceDrop(current.token,route,current.text).then(zone=>{
        if(!zone)return;
        if(current.ended){zone.cancel();return;}
        current.zones.push(zone);zone.element.addClass('is-active');
        zone.element.addEventListener('dragover',e=>e.preventDefault());
        zone.element.addEventListener('drop',finish);
      }).catch(()=>{});
    }
  };
  const finish = (event: MouseEvent | DragEvent) => {
    const current=drag;
    if (!current || Math.hypot(event.clientX-current.x,event.clientY-current.y)<6) {cancel();return;}
    const zone=current.zones.find(z=>{const r=z.element.getBoundingClientRect();return event.clientX>=r.left && event.clientX<=r.right && event.clientY>=r.top && event.clientY<=r.bottom;});
    if (zone) {consumedPointer=true;event.preventDefault();event.stopImmediatePropagation();void zone.complete().catch(error=>new Notice(String(error)));}
    cancel();
  };
  plugin.registerDomEvent(doc,'pointerdown',event=>{
    cancel();consumedPointer=false;
    const Element=doc.defaultView?.Element;
    if (event.button!==0 || !Element || !(event.target instanceof Element))return;
    const row=event.target.closest('.nav-file-title[data-path], .nav-folder-title[data-path]');
    const source=row?.getAttribute('data-path');
    const file=source===null || source===undefined ? null : plugin.app.vault.getAbstractFileByPath(source);
    const text=readingReference(plugin,event.target);
    if (!text && !(file instanceof TFolder) && !(file instanceof TFile && file.extension.toLowerCase()==='md'))return;
    const views=plugin.app.workspace.getLeavesOfType(VIEW_TYPE).filter(leaf=>leaf.view.containerEl.ownerDocument===doc).map(leaf=>({view:leaf.view as T3View,route:(leaf.view as T3View).getState().target}));
    drag={x:event.clientX,y:event.clientY,token:text ? '' : plugin.referenceDrags.capture([file!.path]),text:text ?? undefined,zones:[],ended:false,started:false,views};
  },{capture:true});
  plugin.registerDomEvent(doc,'pointermove',event=>{if(drag && !drag.text && Math.hypot(event.clientX-drag.x,event.clientY-drag.y)>=6)prepareZones(drag);},{capture:true});
  plugin.registerDomEvent(doc,'pointerup',finish,{capture:true});
  plugin.registerDomEvent(doc,'mouseup',event=>{if(consumedPointer){event.preventDefault();event.stopImmediatePropagation();consumedPointer=false;return;}finish(event);},{capture:true});
  plugin.registerDomEvent(doc,'keydown',event=>{if(event.key==='Escape')cancel();},{capture:true});
  plugin.registerDomEvent(doc,'dragend',cancel);
  plugin.registerDomEvent(doc,'dragstart',event=>{
    if(!event.dataTransfer)return;
    if(drag){if(drag.text)event.dataTransfer.setData('text/plain',drag.text);else event.dataTransfer.setData(REFERENCE_MIME,drag.token);prepareZones(drag);return;}
    const Element=doc.defaultView?.Element;
    if(!Element || !(event.target instanceof Element))return;
    const source=event.target.closest('.nav-file-title[data-path], .nav-folder-title[data-path]')?.getAttribute('data-path');
    const file=source===null || source===undefined?null:plugin.app.vault.getAbstractFileByPath(source);
    if(file instanceof TFolder || (file instanceof TFile && file.extension.toLowerCase()==='md'))event.dataTransfer.setData(REFERENCE_MIME,plugin.referenceDrags.capture([file.path]));
  });
}
