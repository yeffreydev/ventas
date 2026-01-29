#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function diagnoseUser() {
    const userId = '61f69eb5-091e-4915-9124-debc5e92d929';
    
    console.log('🔍 Diagnosticando usuario:', userId);
    console.log('Email: oswaldochipanicu@gmail.com\n');
    
    // Check user_accessible_workspaces
    console.log('1. Verificando user_accessible_workspaces...');
    const { data: workspaces, error: wsError } = await supabase
        .from('user_accessible_workspaces')
        .select('*')
        .eq('user_id', userId);
    
    if (wsError) {
        console.error('❌ Error:', wsError);
    } else {
        console.log('✅ Workspaces accesibles:', workspaces.length);
        workspaces.forEach(ws => {
            console.log(`   - ${ws.name} (${ws.id})`);
            console.log(`     is_owner: ${ws.is_owner}`);
            console.log(`     role: ${ws.role}`);
            console.log(`     access_type: ${ws.access_type}`);
        });
    }
    
    // Check workspace_members
    console.log('\n2. Verificando workspace_members...');
    const { data: members, error: memberError } = await supabase
        .from('workspace_members')
        .select('*, workspaces(name, owner_id)')
        .eq('user_id', userId);
    
    if (memberError) {
        console.error('❌ Error:', memberError);
    } else {
        console.log('✅ Membresías:', members.length);
        members.forEach(m => {
            console.log(`   - ${m.workspaces.name}`);
            console.log(`     role: ${m.role}`);
            console.log(`     is_owner: ${m.workspaces.owner_id === userId}`);
        });
    }
    
    // Check workspaces owned
    console.log('\n3. Verificando workspaces donde es owner...');
    const { data: ownedWorkspaces, error: ownError } = await supabase
        .from('workspaces')
        .select('*')
        .eq('owner_id', userId);
    
    if (ownError) {
        console.error('❌ Error:', ownError);
    } else {
        console.log('✅ Workspaces propios:', ownedWorkspaces.length);
        ownedWorkspaces.forEach(ws => {
            console.log(`   - ${ws.name} (${ws.id})`);
        });
    }
    
    // Try RPC function
    if (workspaces && workspaces.length > 0) {
        console.log('\n4. Verificando permisos con RPC...');
        const workspaceId = workspaces[0].id;
        const { data: perms, error: permError } = await supabase.rpc('get_user_permissions', {
            p_user_id: userId,
            p_workspace_id: workspaceId
        });
        
        if (permError) {
            console.error('❌ Error RPC:', permError.message);
        } else {
            console.log('✅ Permisos:', JSON.stringify(perms, null, 2));
        }
    }
    
    console.log('\n✅ Diagnóstico completado');
}

diagnoseUser();
