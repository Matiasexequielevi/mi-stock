import {jsPDF} from 'jspdf';
export function salePdf(sale,lines,business='Mi Stock'){
 const doc=new jsPDF();const w=210;let y=18;
 doc.setFillColor(20,37,63);doc.rect(0,0,w,39,'F');doc.setTextColor(255);doc.setFont('helvetica','bold');doc.setFontSize(19);doc.text(business.slice(0,36),15,19);doc.setFontSize(10);doc.setFont('helvetica','normal');doc.text('COMPROBANTE DE VENTA',15,29);doc.setTextColor(30,41,59);
 y=52;doc.setFontSize(10);doc.text(`Venta: ${sale.id.slice(0,8).toUpperCase()}`,15,y);doc.text(`Fecha: ${new Date(sale.created_at).toLocaleString('es-AR')}`,105,y);y+=15;
 doc.setFillColor(236,242,249);doc.rect(15,y-6,180,10,'F');doc.setFont('helvetica','bold');doc.text('Producto',18,y);doc.text('Cant.',119,y);doc.text('Precio',143,y);doc.text('Subtotal',190,y,{align:'right'});y+=10;
 doc.setFont('helvetica','normal');const money=n=>'$ '+Number(n).toLocaleString('es-AR',{minimumFractionDigits:2,maximumFractionDigits:2});
 for(const l of lines){if(y>266){doc.addPage();y=22}const name=doc.splitTextToSize(l.product_name||'Producto',93);doc.text(name,18,y);doc.text(String(l.quantity),122,y);doc.text(money(l.unit_price),143,y);doc.text(money(l.subtotal),190,y,{align:'right'});y+=Math.max(9,name.length*5+3)}
 y+=6;if(y>264){doc.addPage();y=25}doc.setDrawColor(210,220,230);doc.line(15,y,195,y);y+=11;doc.setFont('helvetica','bold');doc.setFontSize(15);doc.text('TOTAL',15,y);doc.text(money(sale.total),190,y,{align:'right'});y+=14;doc.setFont('helvetica','normal');doc.setFontSize(9);doc.setTextColor(95,105,120);doc.text('Comprobante interno de venta. No válido como factura fiscal.',15,y);
 doc.save(`venta-${sale.id.slice(0,8)}.pdf`);
}
