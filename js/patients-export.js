/* Descarga bajo demanda; respeta los filtros y nunca consulta ni expone historias clínicas. */
(function(){
  'use strict';
  const $=id=>document.getElementById(id);
  function downloadCsv(report,filename){
    const encode=v=>'"'+String(v??'').replace(/"/g,'""')+'"';
    const content='sep=;\r\n'+[report.headers,...report.rows].map(r=>r.map(encode).join(';')).join('\r\n');
    const blob=new Blob(['\uFEFF',content],{type:'text/csv;charset=utf-8;'});
    const url=URL.createObjectURL(blob),a=document.createElement('a');
    a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  function makeExcel(report,meta,file){
    const x=window.XLSX;
    const rows=[['DIRECTORIO DE PACIENTES · CRM'],[],['Filtro',meta.filterLabel],['Búsqueda',meta.search||'Sin búsqueda'],['Generado (hora de Perú)',meta.generated],['Total de pacientes',report.total],[],report.headers,...report.rows];
    const ws=x.utils.aoa_to_sheet(rows);
    ws['!merges']=[{s:{r:0,c:0},e:{r:0,c:18}}];
    ws['!cols']=[8,35,17,19,16,13,22,23,18,12,17,19,23,24,23,24,20,20,27].map(wch=>({wch}));
    ws['!autofilter']={ref:`A8:S${Math.max(8,8+report.total)}`};
    ws['!rows']=[{hpt:30},{hpt:8},{hpt:20},{hpt:20},{hpt:20},{hpt:22},{hpt:8},{hpt:30}];
    const range=x.utils.decode_range(ws['!ref']);
    for(let r=0;r<=range.e.r;r++)for(let c=0;c<=range.e.c;c++){
      const addr=x.utils.encode_cell({r,c}),cell=ws[addr];if(!cell)continue;
      if(r===0){cell.s={font:{bold:true,sz:17,color:{rgb:'FFFFFF'}},fill:{fgColor:{rgb:'356B69'}}};}
      else if(r===7){cell.s={font:{bold:true,color:{rgb:'FFFFFF'}},fill:{fgColor:{rgb:'356B69'}},alignment:{wrapText:true,vertical:'center'}};}
      else if(r>=8&&r%2===0){cell.s={fill:{fgColor:{rgb:'EFF6F4'}}};}
      if(r>=8&&c>=14&&c<=15&&cell.t==='n')cell.z='#,##0.00';
      // DNI y teléfonos deben permanecer como texto, incluso con ceros iniciales.
      if(r>=8&&[1,2,3,5,6,7,8,9,12,13,16,17,18].includes(c))cell.t='s';
    }
    const wb=x.utils.book_new();x.utils.book_append_sheet(wb,ws,'Pacientes');
    x.writeFile(wb,file,{compression:true});
  }
  window.downloadPatientsExcel=function(){
    const state=window._profileState;
    if(!state?.currentUser){alert('Inicia sesión para descargar el directorio de pacientes.');return;}
    if(!state.patientsReady||!state.appointmentsReady||state.syncErrors?.patients||state.syncErrors?.appointments){
      alert('Los pacientes o las citas aún no terminaron de cargar. Comprueba la conexión antes de exportar.');return;
    }
    const core=window.PatientExportCore;
    if(!core){alert('No se pudo cargar el módulo de exportación. Actualiza la página.');return;}
    const selector=$('v2-crm-filter'),filter=selector?.value||'todos',search=$('v2-crm-search')?.value||'';
    const report=core.buildReport(state.patients,state.appointments,{filter,search,today:core.todayPeru(),remaining:a=>window.CRMCore?.remaining?.(a)??Math.max(0,Number(a.cost||0)-Number(a.paidAmount||0))});
    if(!report.total){alert('No hay pacientes que coincidan con los filtros seleccionados.');return;}
    const filterLabel=selector?.selectedOptions?.[0]?.textContent?.trim()||'Todos los estados';
    const generated=new Date().toLocaleString('es-PE',{timeZone:'America/Lima'});
    const suffix=filter==='todos'?'todos':filter;
    const filename=`Pacientes_CRM_${suffix}_${core.todayPeru()}`;
    try{
      if(window.XLSX?.utils?.aoa_to_sheet&&typeof window.XLSX.writeFile==='function')makeExcel(report,{filterLabel,search,generated},filename+'.xlsx');
      else{downloadCsv(report,filename+'.csv');alert('No se pudo cargar la librería Excel. Se descargó el mismo listado en CSV, compatible con Excel.');}
    }catch(error){console.error('[Exportación de pacientes]',error);alert('No se pudo generar la descarga: '+(error?.message||'error inesperado'));}
  };
})();
