import { test } from 'node:test';
import assert from 'node:assert/strict';
import { relationshipGuide } from '../../resources/js/erd/relationship-guide.mjs';
const tables = [
    {id:'customers',name:'customers',primaryKey:['id'],uniqueKeys:[],columns:[{id:'c.id',name:'id',type:'integer',key:'PK',nullable:false}]},
    {id:'orders',name:'orders',primaryKey:['id'],uniqueKeys:[],columns:[{id:'o.id',name:'id',type:'integer',key:'PK',nullable:false},{id:'o.customer',name:'customer_id',type:'integer',key:'',nullable:true}]},
];
function guide() {const g=relationshipGuide();g.$wire={tables};g.left='customers';g.right='orders';g.syncColumns();g.name='orders_customer';return g;}
test('business answers place the FK on the many side and explain the direction',()=>{
 const g=guide();assert.equal(g.plan.fromTable,'orders');assert.equal(g.plan.toTable,'customers');assert.equal(g.plan.kind,'many-to-one');assert.match(g.summary,/customers/);assert.match(g.summary,/many/);assert.equal(g.pairs[0].from,'o.customer');
 g.leftToRight='one';g.rightToLeft='many';g.syncColumns();assert.equal(g.plan.fromTable,'customers');assert.equal(g.plan.toTable,'orders');
});
test('one-to-one and optional answers drive the actual constraints in the plan',()=>{
 const g=guide();g.leftToRight='one';g.rightToLeft='one';g.referenceSide='right';g.optional=true;g.syncColumns();assert.equal(g.plan.kind,'one-to-one');assert.equal(g.plan.optional,true);assert.match(g.changes.join(' '),/UNIQUE/);assert.match(g.changes.join(' '),/NULL/);
});
test('many-to-many selects complete keys and explains the intermediate table',()=>{
 const g=guide();g.leftToRight='many';g.rightToLeft='many';g.junctionName='customer_orders';g.syncColumns();assert.equal(g.plan.kind,'many-to-many');assert.deepEqual(g.plan.fromColumns,['c.id']);assert.deepEqual(g.plan.toColumns,['o.id']);assert.equal(g.plan.junctionName,'customer_orders');assert.match(g.changes.join(' '),/two foreign keys/);
});
test('existing primary keys cannot be advertised as optional references',()=>{
 const g=guide();g.leftToRight='one';g.rightToLeft='one';g.referenceSide='right';g.syncColumns();g.pairs[0].from='o.id';g.optional=true;assert.match(g.conflict,/primary key/i);
});
