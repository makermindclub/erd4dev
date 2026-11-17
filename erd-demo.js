/* ERD4Dev: demo editor for entities, attributes, relationships, and SQL.
   No external dependencies or integration with the package's actual backend. */
(() => {
  'use strict';
  const root = document.getElementById('erd-playground');
  if (!root) return;
  const $ = (selector, context = document) => context.querySelector(selector);
  const $$ = (selector, context = document) => [...context.querySelectorAll(selector)];
  const stage = $('#ed-workspace');
  const nodesEl = $('#ed-nodes');
  const edgesEl = $('#ed-edge-lines');
  const draftLine = $('#ed-draft-line');
  const hint = $('#ed-hint');
  const connectButton = $('#ed-connect');
  const dialog = $('#ed-dialog');
  const modalBody = $('#ed-dialog-fields');
  const modalError = $('#ed-dialog-error');
  const esc = value => String(value).replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[char]);
  const validIdentifier = value => /^[A-Za-z_][A-Za-z0-9_]*$/.test(value);
  const fieldTypes = ['BIGINT', 'INT', 'VARCHAR', 'TEXT', 'DATE', 'DECIMAL', 'BOOLEAN', 'JSON'];
  const nodeWidth = 254;
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  let entities = [];
  let relations = [];
  let currentTab = 'er';
  let selectedId = null;
  let editTarget = null;
  let activeDrag = null;
  let wireDrag = null;
  let connectMode = null; // null, 'choose', or source entity id
  let serial = 0;
  let lastFocus = null;

  function initialModel() {
    const width = Math.max(850, stage.clientWidth);
    entities = [
      {id:'users', name:'users', x:Math.round(width*.085), y:105, fields:[
        {name:'id', type:'BIGINT', pk:true},
        {name:'username', type:'VARCHAR', pk:false},
        {name:'password', type:'VARCHAR', pk:false}
      ]},
      {id:'diagrams', name:'diagrams', x:Math.min(width - 280,Math.round(width*.64)), y:112, fields:[
        {name:'id', type:'BIGINT', pk:true},
        {name:'name', type:'VARCHAR', pk:false},
        {name:'data', type:'TEXT', pk:false}
      ]}
    ];
    relations = [{id:'r1', from:'users', to:'diagrams', name:'relates', cardinality:'1:N'}];
    serial = 1;
    selectedId = null;
    connectMode = null;
    wireDrag = null;
    activeDrag = null;
    setHint('Click the pencil to edit • Drag to move');
    updateConnectButton();
  }

  function notify(message) { hint.textContent = message; }
  function setHint(message) { hint.textContent = message; }
  function updateConnectButton() {
    const active = connectMode !== null;
    connectButton.classList.toggle('is-active', active);
    connectButton.setAttribute('aria-pressed', String(active));
    connectButton.textContent = active ? '× Cancel relationship' : '◇ Connect';
    stage.classList.toggle('ed-is-linking', active);
  }
  function getEntity(id) { return entities.find(item => item.id === id); }
  function generateId(prefix) { serial += 1; return `${prefix}-${serial}`; }
  function uniqueEntityName(raw) {
    const name = (raw || 'new_entity').trim();
    return entities.some(entity => entity.name.toLowerCase() === name.toLowerCase()) ? null : name;
  }
  function typeSQL(type) {
    return type === 'VARCHAR' ? 'VARCHAR(255)' : type === 'DECIMAL' ? 'DECIMAL(10,2)' : type;
  }
  function singular(name) { return name.endsWith('s') && name.length > 3 ? name.slice(0,-1) : name; }
  function fieldLabel(field) { return `${field.pk ? 'PK' : ''} ${field.name} ${field.type}`.trim(); }
  function nodeHeight(entity) { return 45 + entity.fields.length * 34 + 39; }

  function renderNodes() {
    nodesEl.innerHTML = entities.map(entity => `
      <article class="ed-node ${selectedId === entity.id ? 'ed-selected' : ''}" data-node-id="${esc(entity.id)}" aria-label="Entity ${esc(entity.name)}, ${entity.fields.length} attributes" style="left:${entity.x}px;top:${entity.y}px">
        <div class="ed-node-head" title="Drag to move or click to select">
          <span class="ed-node-badge" aria-hidden="true">▦</span>
          <span class="ed-node-name">${esc(entity.name)}</span>
          <span class="ed-node-count">${entity.fields.length}</span>
          <button class="ed-node-button" type="button" data-edit-node="${esc(entity.id)}" title="Edit entity ${esc(entity.name)}" aria-label="Edit entity ${esc(entity.name)}">✎</button>
        </div>
        ${entity.fields.map(field => `<div class="ed-node-row ${field.pk ? 'ed-pk' : ''}" title="${esc(fieldLabel(field))}"><span class="ed-field-mark">${field.pk ? 'PK' : '•'}</span><span class="ed-field-name">${esc(field.name)}</span><span class="ed-field-type">${esc(field.type.toLowerCase())}</span></div>`).join('')}
        <button type="button" class="ed-node-add-field" data-field-node="${esc(entity.id)}">＋ attribute</button>
        <button type="button" class="ed-port ed-port-in" data-port="${esc(entity.id)}" aria-label="Connect to entity ${esc(entity.name)}" title="Drag to connect to another entity"></button>
        <button type="button" class="ed-port ed-port-out" data-port="${esc(entity.id)}" aria-label="Create connection from ${esc(entity.name)}" title="Drag to another entity"></button>
      </article>`).join('');
  }

  function portPoint(entity, side) {
    return {x:entity.x + (side === 'right' ? nodeWidth : 0), y:entity.y + 85};
  }
  function getEdgeGeometry(link) {
    const from = getEntity(link.from), to = getEntity(link.to);
    if (!from || !to) return null;
    const toRight = to.x + nodeWidth/2 >= from.x + nodeWidth/2;
    const p1 = portPoint(from, toRight ? 'right' : 'left');
    const p2 = portPoint(to, toRight ? 'left' : 'right');
    const sign = toRight ? 1 : -1;
    const middle = {x:(p1.x + p2.x)/2, y:(p1.y + p2.y)/2};
    const diamondHalfWidth = 55;
    const d1x = middle.x - sign*diamondHalfWidth;
    const d2x = middle.x + sign*diamondHalfWidth;
    const d1 = `M ${p1.x} ${p1.y} C ${p1.x + sign*60} ${p1.y}, ${d1x - sign*48} ${middle.y}, ${d1x} ${middle.y}`;
    const d2 = `M ${d2x} ${middle.y} C ${d2x + sign*48} ${middle.y}, ${p2.x - sign*60} ${p2.y}, ${p2.x} ${p2.y}`;
    return {p1,p2,middle,sign,d1,d2};
  }

  function renderEdges() {
    const width = stage.clientWidth;
    const height = stage.clientHeight;
    $('#ed-links').setAttribute('viewBox', `0 0 ${width} ${height}`);
    edgesEl.innerHTML = relations.map(link => {
      const g = getEdgeGeometry(link);
      if (!g) return '';
      const {p1,p2,middle,sign,d1,d2} = g;
      const cardFrom = link.cardinality.split(':')[0] === '1' ? '||' : 'N';
      const cardTo = link.cardinality.split(':')[1] === '1' ? '||' : 'N';
      const diamondPoints = `${middle.x-55},${middle.y} ${middle.x},${middle.y-26} ${middle.x+55},${middle.y} ${middle.x},${middle.y+26}`;
      return `<g class="ed-edge" data-edge-id="${esc(link.id)}">
          <path class="ed-edge-line" d="${d1}"/><path class="ed-edge-line" d="${d2}"/>
          <text class="ed-edge-cardinality" x="${p1.x+sign*19}" y="${p1.y-10}" text-anchor="middle">${cardFrom}</text>
          <text class="ed-edge-cardinality" x="${p2.x-sign*20}" y="${p2.y-10}" text-anchor="middle">${cardTo}</text>
          <circle class="ed-edge-end" r="5" cx="${p1.x}" cy="${p1.y}"/><circle class="ed-edge-end" r="5" cx="${p2.x}" cy="${p2.y}"/>
          <g class="ed-diamond-hit" data-edit-edge="${esc(link.id)}" tabindex="0" role="button" aria-label="Edit relationship between ${esc(getEntity(link.from).name)} and ${esc(getEntity(link.to).name)}">
            <polygon class="ed-rel-diamond" points="${diamondPoints}"/><text class="ed-rel-label" x="${middle.x}" y="${middle.y+4}" text-anchor="middle">${esc(link.name.slice(0,13))}</text>
          </g>
        </g>`;
    }).join('');
    if (!wireDrag) draftLine.hidden = true;
  }

  function summaryCounts() {
    $('#ed-entity-count').textContent = `${entities.length} ${entities.length === 1 ? 'entity' : 'entities'}`;
    $('#ed-relation-count').textContent = `${relations.length} ${relations.length === 1 ? 'relationship' : 'relationships'}`;
  }

  function augmentedTables() {
    const tables = entities.map(entity => ({name:entity.name, fields:entity.fields.map(field => ({...field}))}));
    const extra = [];
    for (const relation of relations) {
      const from = getEntity(relation.from), to = getEntity(relation.to);
      if (!from || !to) continue;
      const pk = from.fields.find(field=>field.pk) || from.fields[0];
      const targetPk = to.fields.find(field=>field.pk) || to.fields[0];
      if (!pk || !targetPk) continue;
      const ref = {name:`${singular(from.name)}_${pk.name}`,type:pk.type,pk:false,fk:true,reference:`${from.name}(${pk.name})`,unique:relation.cardinality==='1:1'};
      if (relation.cardinality==='N:N') {
        const joinName = `${from.name}_${to.name}`;
        const f1 = {name:`${singular(from.name)}_${pk.name}`,type:pk.type,pk:false,fk:true,reference:`${from.name}(${pk.name})`};
        const f2 = {name:`${singular(to.name)}_${targetPk.name}`,type:targetPk.type,pk:false,fk:true,reference:`${to.name}(${targetPk.name})`};
        if (!tables.some(table=>table.name===joinName) && !extra.some(table=>table.name===joinName)) extra.push({name:joinName,fields:[f1,f2],join:true});
      } else {
        const target = tables.find(table=>table.name===to.name);
        if (target && !target.fields.some(field=>field.name===ref.name)) target.fields.push(ref);
      }
    }
    return [...tables,...extra];
  }

  function generateSQL() {
    const tables = augmentedTables();
    return tables.map(table => {
      const declarations = table.fields.map(field => {
        const flags = [field.pk ? 'PRIMARY KEY' : '', field.unique ? 'UNIQUE' : '', (field.pk || field.fk) ? 'NOT NULL' : ''].filter(Boolean).join(' ');
        return `  ${field.name} ${typeSQL(field.type)}${flags ? ' ' + flags : ''}`;
      });
      for (const field of table.fields.filter(field=>field.fk)) {
        const constraint = `fk_${table.name}_${field.name}`.slice(0,60);
        declarations.push(`  CONSTRAINT ${constraint} FOREIGN KEY (${field.name}) REFERENCES ${field.reference}`);
      }
      return `CREATE TABLE ${table.name} (\n${declarations.join(',\n')}\n);`;
    }).join('\n\n');
  }

  function renderRelational() {
    $('#ed-rel-content').innerHTML = augmentedTables().map(table => `<article class="ed-rel-table"><h4>▦ ${esc(table.name)}${table.join?' · junction':''}</h4>${table.fields.map(field => `<div class="ed-rel-table-row"><span><strong>${field.pk?'PK':field.fk?'FK':'•'}</strong> ${esc(field.name)}</span><em>${esc(field.type.toLowerCase())}${field.unique?' · unique':''}</em></div>`).join('')}</article>`).join('') || '<p class="ed-rel-empty">Create an entity to view a relational table.</p>';
  }
  function renderSQL() { $('#ed-sql-code').textContent = `-- SQL preview generated by the ERD4Dev demo\n-- Check types and constraints before running.\n\n${generateSQL() || '-- Add entities to the ER Model to get started.'}`; }
  function render() { renderNodes(); renderEdges(); summaryCounts(); renderRelational(); renderSQL(); }

  function setTab(tab) {
    currentTab = tab;
    for (const name of ['er','rel','sql']) {
      const selected = name===tab;
      const button = $(`#ed-tab-${name}`);
      button.classList.toggle('active',selected);
      button.setAttribute('aria-selected', String(selected));
      button.tabIndex = selected ? 0 : -1;
      $(`#ed-${name}-panel`).hidden = !selected;
    }
    $('#ed-toolbar').hidden = tab !== 'er';
    if (tab === 'rel') renderRelational();
    if (tab === 'sql') renderSQL();
    if (tab === 'er') requestAnimationFrame(renderEdges);
  }

  function addEntity(raw) {
    const name = uniqueEntityName(raw);
    if (!name) { notify('An entity with that name already exists.'); return; }
    if (!validIdentifier(name)) { notify('Use a name without spaces, starting with a letter or _.'); return; }
    const width = stage.clientWidth;
    const count = entities.length - 2;
    const newEntity = {
      id:generateId('entity'), name,
      x:clamp(Math.round(width*.30) + (count % 4)*38, 15, Math.max(15,width-nodeWidth-15)),
      y:clamp(240 + ((count%3)*25),15, stage.clientHeight-130),
      fields:[{name:'id',type:'BIGINT',pk:true},{name:'name',type:'VARCHAR',pk:false}]
    };
    entities.push(newEntity);
    selectedId = newEntity.id;
    render();
    notify(`Entity “${name}” created. Drag the purple bar to move it.`);
    $('#ed-new-name').value = '';
  }

  function newRelation(from, to) {
    if (from===to) { notify('Choose two different entities.'); return; }
    if (relations.some(link=>(link.from===from&&link.to===to)||(link.from===to&&link.to===from))) { notify('These entities are already related. Click the diamond to edit.'); return; }
    relations.push({id:generateId('relation'),from,to,name:'relates',cardinality:'1:N'});
    connectMode=null;
    updateConnectButton();
    render();
    notify(`Connection created: ${getEntity(from).name} → ${getEntity(to).name}. Click the diamond to edit.`);
  }
  function chooseEntityForRelation(id) {
    if (connectMode === 'choose') { connectMode=id; notify(`Source: ${getEntity(id).name}. Now click the destination entity.`); }
    else if (typeof connectMode === 'string') { newRelation(connectMode,id); }
    updateConnectButton();
  }

  function pointerPosition(event) {
    const bounds = stage.getBoundingClientRect();
    return {x:event.clientX-bounds.left,y:event.clientY-bounds.top};
  }
  function draftTo(event) {
    if (!wireDrag) return;
    const entity = getEntity(wireDrag.from);
    if (!entity) return;
    const start = portPoint(entity, wireDrag.side);
    const end = pointerPosition(event);
    const dx = (end.x-start.x)*.6;
    draftLine.setAttribute('d',`M ${start.x} ${start.y} C ${start.x+dx} ${start.y}, ${end.x-dx} ${end.y}, ${end.x} ${end.y}`);
    draftLine.hidden = false;
  }

  function startDragNode(event, head, entity) {
    selectedId = entity.id;
    if (connectMode !== null) return;
    event.preventDefault();
    const node = head.closest('.ed-node');
    activeDrag = {id:entity.id, x:event.clientX, y:event.clientY, originalX:entity.x, originalY:entity.y, node, pointerId:event.pointerId};
    head.setPointerCapture?.(event.pointerId);
    node.classList.add('ed-selected');
  }
  nodesEl.addEventListener('pointerdown', event => {
    const port = event.target.closest('[data-port]');
    if (port) {
      const from = getEntity(port.dataset.port);
      if (!from) return;
      event.preventDefault();
      event.stopPropagation();
      selectedId = from.id;
      wireDrag = {from:from.id,side:port.classList.contains('ed-port-out')?'right':'left',pointerId:event.pointerId,startX:event.clientX,startY:event.clientY};
      port.setPointerCapture?.(event.pointerId);
      draftTo(event);
      return;
    }
    const head = event.target.closest('.ed-node-head');
    if (head && !event.target.closest('button')) {
      const entity = getEntity(head.closest('[data-node-id]')?.dataset.nodeId);
      if (entity) startDragNode(event,head,entity);
    }
  });
  document.addEventListener('pointermove', event => {
    if (activeDrag && activeDrag.pointerId === event.pointerId) {
      const entity = getEntity(activeDrag.id);
      if (!entity) return;
      const x = clamp(activeDrag.originalX + event.clientX - activeDrag.x,12,stage.clientWidth-nodeWidth-12);
      const y = clamp(activeDrag.originalY + event.clientY - activeDrag.y,12,stage.clientHeight-nodeHeight(entity)-10);
      entity.x = Math.round(x); entity.y = Math.round(y);
      activeDrag.node.style.left = `${entity.x}px`;
      activeDrag.node.style.top = `${entity.y}px`;
      renderEdges();
    }
    if (wireDrag && wireDrag.pointerId === event.pointerId) draftTo(event);
  });
  document.addEventListener('pointerup', event => {
    if (activeDrag && activeDrag.pointerId===event.pointerId) {
      activeDrag=null;
      renderNodes();
    }
    if (wireDrag && wireDrag.pointerId===event.pointerId) {
      const drag = wireDrag;
      wireDrag=null;
      draftLine.hidden=true;
      const destination = document.elementFromPoint(event.clientX,event.clientY)?.closest('[data-node-id]')?.dataset.nodeId;
      if (destination && destination !== drag.from) newRelation(drag.from,destination);
      else { connectMode=drag.from; updateConnectButton(); notify(`Click the destination entity to connect ${getEntity(drag.from)?.name||'the source'}.`); }
    }
  });
  document.addEventListener('pointercancel', () => {activeDrag=null; wireDrag=null; draftLine.hidden=true;});
  nodesEl.addEventListener('click', event => {
    const edit = event.target.closest('[data-edit-node]');
    if (edit) { openEntityDialog(edit.dataset.editNode); return; }
    const addField = event.target.closest('[data-field-node]');
    if (addField) { openEntityDialog(addField.dataset.fieldNode,true); return; }
    const node = event.target.closest('[data-node-id]');
    if (!node || event.target.closest('[data-port]')) return;
    if (connectMode !== null) { chooseEntityForRelation(node.dataset.nodeId); return; }
    selectedId=node.dataset.nodeId;
    $$('.ed-node',nodesEl).forEach(el=>el.classList.toggle('ed-selected',el.dataset.nodeId===selectedId));
  });
  nodesEl.addEventListener('dblclick',event => {
    const node=event.target.closest('[data-node-id]');
    if(node&&!event.target.closest('button')) openEntityDialog(node.dataset.nodeId);
  });
  edgesEl.addEventListener('click',event => {
    const group=event.target.closest('[data-edit-edge]');
    if (group) openRelationDialog(group.dataset.editEdge);
  });
  edgesEl.addEventListener('keydown',event => {
    const group=event.target.closest('[data-edit-edge]');
    if(group&&(event.key==='Enter'||event.key===' ')) {event.preventDefault();openRelationDialog(group.dataset.editEdge);}
  });

  function fieldRow(field={name:'',type:'VARCHAR',pk:false}) {
    return `<div class="ed-dialog-field"><input class="ed-dialog-input ed-field-input" aria-label="Attribute name" maxlength="35" value="${esc(field.name)}" placeholder="attribute" spellcheck="false"><select aria-label="Attribute type" class="ed-dialog-input ed-type-input">${fieldTypes.map(type=>`<option value="${type}" ${field.type===type?'selected':''}>${type.toLowerCase()}</option>`).join('')}</select><button type="button" class="ed-dialog-remove" data-remove-field title="Remove attribute" aria-label="Remove attribute">×</button><label class="ed-dialog-check"><input class="ed-pk-input" type="checkbox" ${field.pk?'checked':''}> primary key</label></div>`;
  }
  function openDialog() {
    lastFocus=document.activeElement;
    modalError.textContent='';
    dialog.hidden=false;
    document.body.style.overflow='hidden';
    requestAnimationFrame(()=>$('.ed-dialog-input',dialog)?.focus());
  }
  function closeDialog() {
    dialog.hidden=true;
    document.body.style.overflow='';
    editTarget=null;
    lastFocus?.focus?.();
  }
  function openEntityDialog(id,addField=false) {
    const entity=getEntity(id); if(!entity) return;
    editTarget={type:'entity',id};
    $('#ed-dialog-title').textContent=`Edit ${entity.name}`;
    modalBody.innerHTML=`<label for="ed-edit-name" class="ed-dialog-label">ENTITY NAME</label><input id="ed-edit-name" class="ed-dialog-input" spellcheck="false" maxlength="28" value="${esc(entity.name)}"><div class="ed-dialog-fields-head"><span>ATTRIBUTES / FIELDS</span><button type="button" class="ed-action ed-action-secondary" id="ed-dialog-add-field">＋ Attribute</button></div><div class="ed-dialog-fields-list" id="ed-fields-list">${entity.fields.map(fieldRow).join('')}</div><p class="ed-dialog-help">Set the primary key. Changes are reflected in the Relational and SQL tabs.</p><div class="ed-dialog-inline"><button class="ed-dialog-danger" type="button" id="ed-delete-entity">Delete entity</button></div>`;
    if(addField) $('#ed-fields-list').insertAdjacentHTML('beforeend',fieldRow());
    openDialog();
    if(addField) $$('.ed-field-input').at(-1)?.focus();
  }
  function openRelationDialog(id) {
    const link=relations.find(item=>item.id===id);if(!link)return;
    editTarget={type:'relation',id};
    $('#ed-dialog-title').textContent='Edit relationship';
    modalBody.innerHTML=`<label for="ed-edit-name" class="ed-dialog-label">RELATIONSHIP NAME</label><input id="ed-edit-name" class="ed-dialog-input" maxlength="13" value="${esc(link.name)}" spellcheck="false"><div class="ed-dialog-inline"><label class="ed-dialog-label" for="ed-edit-cardinality">CARDINALITY</label><select id="ed-edit-cardinality" class="ed-dialog-input"><option value="1:N" ${link.cardinality==='1:N'?'selected':''}>1 : N — one to many</option><option value="1:1" ${link.cardinality==='1:1'?'selected':''}>1 : 1 — one to one</option><option value="N:N" ${link.cardinality==='N:N'?'selected':''}>N : N — many to many</option></select></div><p class="ed-dialog-help">Source: <strong>${esc(getEntity(link.from)?.name||'')}</strong> → Destination: <strong>${esc(getEntity(link.to)?.name||'')}</strong>. In the SQL preview, 1:N/1:1 creates a foreign key at the destination; N:N creates a junction table.</p><div class="ed-dialog-inline"><button class="ed-dialog-danger" type="button" id="ed-delete-relation">Remove relationship</button></div>`;
    openDialog();
  }
  modalBody.addEventListener('click',event=>{
    if(event.target.closest('#ed-dialog-add-field')) {$('#ed-fields-list').insertAdjacentHTML('beforeend',fieldRow());$$('.ed-field-input',modalBody).at(-1)?.focus();}
    if(event.target.closest('[data-remove-field]')) {event.target.closest('.ed-dialog-field')?.remove();}
    if(event.target.closest('#ed-delete-entity')) {
      const entity=getEntity(editTarget?.id);if(!entity)return;
      entities=entities.filter(item=>item.id!==entity.id);
      relations=relations.filter(link=>link.from!==entity.id&&link.to!==entity.id);
      selectedId=null;
      closeDialog();render();notify(`Entity “${entity.name}” deleted.`);
    }
    if(event.target.closest('#ed-delete-relation')) {
      relations=relations.filter(link=>link.id!==editTarget?.id);
      closeDialog();render();notify('Relationship removed.');
    }
  });
  $('#ed-edit-form').addEventListener('submit',event=>{
    event.preventDefault();
    if(!editTarget)return;
    const name=$('#ed-edit-name')?.value.trim();
    if(!name||!validIdentifier(name)) {modalError.textContent='Use a name without spaces, starting with a letter or _.';return;}
    if(editTarget.type==='entity') {
      const entity=getEntity(editTarget.id);if(!entity)return;
      if(entities.some(item=>item.id!==entity.id&&item.name.toLowerCase()===name.toLowerCase())) {modalError.textContent='Another entity with that name already exists.';return;}
      const fields=[];
      for(const row of $$('.ed-dialog-field',modalBody)) {
        const fieldName=$('.ed-field-input',row).value.trim();
        if(!validIdentifier(fieldName)) {modalError.textContent='Attribute names must use letters, numbers, and _.';return;}
        if(fields.some(field=>field.name.toLowerCase()===fieldName.toLowerCase())) {modalError.textContent='Do not repeat attribute names.';return;}
        fields.push({name:fieldName,type:$('.ed-type-input',row).value,pk:$('.ed-pk-input',row).checked});
      }
      if(!fields.length) {modalError.textContent='The entity must have at least one attribute.';return;}
      if(fields.filter(field=>field.pk).length!==1) {modalError.textContent='Select exactly one primary key for this demo.';return;}
      entity.name=name; entity.fields=fields;
      entity.y=clamp(entity.y,12,stage.clientHeight-nodeHeight(entity)-10);
      notify(`Entity “${name}” updated.`);
    } else {
      const link=relations.find(item=>item.id===editTarget.id);if(!link)return;
      link.name=name;
      link.cardinality=$('#ed-edit-cardinality').value;
      notify(`Relationship “${name}” updated.`);
    }
    closeDialog();render();
  });
  dialog.addEventListener('click',event=>{if(event.target.closest('[data-ed-close]'))closeDialog();});
  document.addEventListener('keydown',event=>{
    if(event.key==='Escape') {
      if(!dialog.hidden) {closeDialog();return;}
      if(connectMode!==null) {connectMode=null;updateConnectButton();setHint('Relationship creation canceled.');}
    }
  });
  $('#ed-create-form').addEventListener('submit',event=>{event.preventDefault();addEntity($('#ed-new-name').value);});
  connectButton.addEventListener('click',()=>{
    connectMode=connectMode===null?'choose':null;
    updateConnectButton();
    notify(connectMode?'Select a source entity and then a destination entity.':'Relationship creation canceled.');
    setTab('er');
  });
  $('#ed-reset').addEventListener('click',()=>{initialModel();setTab('er');render();notify('Original example restored.');});
  $('#ed-export')?.addEventListener('click',()=>{
    const json=JSON.stringify({project:'ERD4Dev - demo',entities,relations},null,2);
    const blob=new Blob([json],{type:'application/json'});
    const url=URL.createObjectURL(blob);
    const anchor=document.createElement('a');anchor.href=url;anchor.download='erd4dev-example.json';document.body.appendChild(anchor);anchor.click();anchor.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
    notify('Diagram exported as JSON.');
  });
  $$('.ed-tab',root).forEach(button=>button.addEventListener('click',()=>setTab(button.dataset.edTab)));
  $('#ed-copy-sql').addEventListener('click',async event=>{
    const original=event.target.textContent;
    try {
      const content=$('#ed-sql-code').textContent;
      if(navigator.clipboard && window.isSecureContext) await navigator.clipboard.writeText(content);
      else {
        const textarea=document.createElement('textarea');textarea.value=content;textarea.style.position='fixed';textarea.style.opacity='0';document.body.appendChild(textarea);textarea.select();if(!document.execCommand('copy'))throw new Error('Copy unavailable');textarea.remove();
      }
      event.target.textContent='Copied!';
    } catch (_) {event.target.textContent='Select the code';}
    setTimeout(()=>{event.target.textContent=original;},1800);
  });
  window.addEventListener('resize',()=>{
    for(const entity of entities) {entity.x=clamp(entity.x,12,stage.clientWidth-nodeWidth-12);entity.y=clamp(entity.y,12,stage.clientHeight-nodeHeight(entity)-10);}
    render();
  });
  initialModel();
  render();
})();
