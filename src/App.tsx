/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import api from './services/api';
import { ICatalogItem, IProductItem, IQualityRecord } from './types';

function escapeHtml(s: any) {
  return String(s ?? '');
}

function stripDivCode(s: string) {
  if (!s) return '';
  return s.replace(/^\d+\s*-?\s*/, '').trim();
}

function fmtDate(d: string | null) {
  if (!d) return '—';
  const dStr = d.split('T')[0];
  const parts = dStr.split('-');
  if (parts.length !== 3) return dStr;
  return parts[2] + '/' + parts[1] + '/' + parts[0];
}

function todayISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function App() {
  const [records, setRecords] = useState<IQualityRecord[]>([]);

  // Catalogs
  const [sectors, setSectors] = useState<ICatalogItem[]>([]);
  const [statuses, setStatuses] = useState<ICatalogItem[]>([]);
  const [divergences, setDivergences] = useState<ICatalogItem[]>([]);
  const [suppliers, setSuppliers] = useState<ICatalogItem[]>([]);
  const [products, setProducts] = useState<IProductItem[]>([]);

  const [search, setSearch] = useState('');
  const [filterSetor, setFilterSetor] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterDiv, setFilterDiv] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  // Form State
  const [fSetorId, setFSetorId] = useState<number | ''>('');
  const [fStatusId, setFStatusId] = useState<number | ''>('');
  const [fCodDivId, setFCodDivId] = useState<number | ''>('');
  const [fQtd, setFQtd] = useState<number>(1);
  const [fFornecedorId, setFFornecedorId] = useState<number | ''>('');
  const [fObs, setFObs] = useState('');
  const [fAcao, setFAcao] = useState('');
  const [fDataObs, setFDataObs] = useState(todayISO());
  const [fDataCorr, setFDataCorr] = useState('');
  const [fResp, setFResp] = useState('');

  const [productSearch, setProductSearch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<IProductItem | null>(null);
  const [autoResults, setAutoResults] = useState<IProductItem[]>([]);
  const [activeAutoIndex, setActiveAutoIndex] = useState(-1);

  useEffect(() => {
    loadCatalogs();
    loadRecords();
  }, []);

  const loadCatalogs = async () => {
    try {
      const [secRes, statRes, divRes, supRes, prodRes] = await Promise.all([
        api.get<ICatalogItem[]>('/catalogs/sectors').catch(() => ({ success: false, data: [] as ICatalogItem[] })),
        api.get<ICatalogItem[]>('/catalogs/statuses').catch(() => ({ success: false, data: [] as ICatalogItem[] })),
        api.get<ICatalogItem[]>('/catalogs/divergence-types').catch(() => ({ success: false, data: [] as ICatalogItem[] })),
        api.get<ICatalogItem[]>('/catalogs/suppliers').catch(() => ({ success: false, data: [] as ICatalogItem[] })),
        api.get<IProductItem[]>('/catalogs/products').catch(() => ({ success: false, data: [] as IProductItem[] }))
      ]);
      
      if (secRes.success) setSectors(secRes.data || []);
      if (statRes.success) setStatuses(statRes.data || []);
      if (divRes.success) setDivergences(divRes.data || []);
      if (supRes.success) setSuppliers(supRes.data || []);
      if (prodRes.success) setProducts(prodRes.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const loadRecords = async () => {
    try {
      const res = await api.get<IQualityRecord[]>('/quality');
      if (res.success) {
        setRecords(res.data || []);
      }
    } catch (e) {
      console.error(e);
    }
  };


  const filteredRecords = useMemo(() => {
    return records.filter(r => {
      if (filterSetor && r.sector_id !== Number(filterSetor)) return false;
      if (filterStatus && r.status_id !== Number(filterStatus)) return false;
      if (filterDiv && r.divergence_type_id !== Number(filterDiv)) return false;
      if (search) {
        const hay = [
          r.product_sku, 
          r.product_name, 
          r.observation, 
          r.correction_action, 
          r.responsible, 
          r.supplier_name
        ].join(' ').toLowerCase();
        
        if (!hay.includes(search.toLowerCase())) return false;
      }
      return true;
    }).sort((a, b) => (b.observation_date || '').localeCompare(a.observation_date || '') || (b.id || 0) - (a.id || 0));
  }, [records, search, filterSetor, filterStatus, filterDiv]);

  const total = records.length;
  const pendente = records.filter(r => r.status_name === 'PENDENTE' || r.status_name === 'Pendente').length;
  const espera = records.filter(r => r.status_name === 'EM ESPERA' || r.status_name === 'Em Espera').length;
  const corrigido = records.filter(r => r.status_name === 'CORRIGIDO' || r.status_name === 'Corrigido').length;
  const pct = (n: number) => total ? Math.round((n / total) * 100) : 0;
  const qualityPct = pct(corrigido);

  let tierLabel = '🥉 Bronze', tierClass = 'bronze';
  if (qualityPct >= 80) { tierLabel = '🥇 Ouro'; tierClass = 'ouro'; }
  else if (qualityPct >= 50) { tierLabel = '🥈 Prata'; tierClass = 'prata'; }

  const handleSearchProduct = (val: string) => {
    setProductSearch(val);
    const term = val.toLowerCase().trim();
    if (!term) { setAutoResults([]); return; }
    const out = [];
    for (let i = 0; i < products.length; i++) {
      const p = products[i];
      if ((p.name && p.name.toLowerCase().includes(term)) || (p.sku && p.sku.toLowerCase().includes(term))) {
        out.push(p);
        if (out.length >= 40) break;
      }
    }
    setAutoResults(out);
    setActiveAutoIndex(-1);
  };

  const openModal = (id: number | null) => {
    setEditingId(id);
    setSelectedProduct(null);
    setProductSearch('');
    setAutoResults([]);

    if (id) {
      const r = records.find(x => x.id === id);
      if (r) {
        setFSetorId(r.sector_id);
        setFStatusId(r.status_id);
        setFCodDivId(r.divergence_type_id || '');
        setFQtd(r.quantity || 1);
        setFFornecedorId(r.supplier_id || '');
        setFObs(r.observation || '');
        setFAcao(r.correction_action || '');
        setFDataObs(r.observation_date ? r.observation_date.split('T')[0] : '');
        setFDataCorr(r.correction_date ? r.correction_date.split('T')[0] : '');
        setFResp(r.responsible || '');
        
        if (r.product_id) {
          const prod = products.find(p => p.id === r.product_id);
          if (prod) setSelectedProduct(prod);
        }
      }
    } else {
      setFSetorId(sectors.length > 0 ? sectors[0].id : '');
      setFStatusId(statuses.length > 0 ? statuses[0].id : '');
      setFCodDivId('');
      setFQtd(1);
      setFFornecedorId('');
      setFObs('');
      setFAcao('');
      setFDataObs(todayISO());
      setFDataCorr('');
      setFResp('');
    }
    setIsModalOpen(true);
  };

  const saveRecord = async () => {
    const data: IQualityRecord = {
      id: editingId || undefined,
      sector_id: Number(fSetorId),
      product_id: selectedProduct ? selectedProduct.id : null,
      supplier_id: fFornecedorId ? Number(fFornecedorId) : null,
      quantity: fQtd,
      divergence_type_id: Number(fCodDivId),
      observation: fObs.trim(),
      correction_action: fAcao.trim(),
      observation_date: fDataObs || todayISO(),
      correction_date: fDataCorr || null,
      status_id: Number(fStatusId),
      responsible: fResp.trim(),
      
      // Temporary fields for local display until Phase 2
      sector_name: sectors.find(s => s.id === Number(fSetorId))?.name,
      status_name: statuses.find(s => s.id === Number(fStatusId))?.name,
      divergence_type_name: divergences.find(d => d.id === Number(fCodDivId))?.name,
      product_name: selectedProduct?.name,
      product_sku: selectedProduct?.sku,
      supplier_name: suppliers.find(s => s.id === Number(fFornecedorId))?.name
    } as IQualityRecord;

    try {
      if (editingId) {
        await api.put(`/quality/${editingId}`, data);
      } else {
        await api.post('/quality', data);
      }
      setIsModalOpen(false);
      loadRecords();
    } catch (e) {
      console.error(e);
      alert('Erro ao salvar registro na API.');
    }
  };

  const deleteRecord = async (id: number) => {
    if (window.confirm('Excluir este registro?')) {
      try {
        await api.delete(`/quality/${id}`);
        loadRecords();
      } catch (e) {
        console.error(e);
        alert('Erro ao excluir registro na API.');
      }
    }
  };

  const exportCSV = () => {
    if (filteredRecords.length === 0) {
      alert('Não há registros para exportar com os filtros atuais.');
      return;
    }
    const headers = ["Setor", "SKU", "Descricao", "Fornecedor", "Quantidade", "Divergencia", "Observacao", "Acao Correcao", "Data Observacao", "Data Correcao", "Status", "Responsavel"];
    const rows = filteredRecords.map(r => [
      r.sector_name, r.product_sku, r.product_name, r.supplier_name, r.quantity, stripDivCode(r.divergence_type_name || ''), r.observation, r.correction_action, r.observation_date?.split('T')[0] || '', r.correction_date?.split('T')[0] || '', r.status_name, r.responsible
    ]);
    const csv = [headers, ...rows].map(row => row.map(v => {
      const s = String(v === undefined || v === null ? '' : v).replace(/"/g, '""');
      return /[",;\\n]/.test(s) ? `"${s}"` : s;
    }).join(';')).join('\n');

    const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'controle-qualidade.csv';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div id="app">
      <header className="top">
        <div className="row">
          <div>
            <div className="eyebrow">Gestão de qualidade · Armazém</div>
            <h1>Controle de Qualidade Diário</h1>
            <div className="sub">Registro de divergências por setor — recebimento, vertical, mercado e expedição.</div>
            <div className="quality-row">
              <span className={`tier-badge ${tierClass}`} id="tierBadge">{tierLabel}</span>
              <div className="quality-track">
                <div className="quality-fill" id="qualityFill" style={{ width: `${qualityPct}%` }}></div>
              </div>
              <span className="quality-pct" id="qualityPct">{qualityPct}%</span>
            </div>
          </div>
          <div className="meta" id="todayLabel">
            {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
          </div>
        </div>
      </header>

      <div className="kpi-strip" id="stats">
        <div className="stat total" style={{ opacity: 1, transform: 'none' }}>
          <div className="top-row"><div className="stat-icon">📋</div></div>
          <div className="num-row"><div className="n">{total}</div><div className="l">Registros</div></div>
          <div className="stat-bar"><i style={{ width: '100%' }}></i></div>
        </div>
        <div className="stat pending" style={{ opacity: 1, transform: 'none' }}>
          <div className="top-row"><div className="stat-icon">⚠️</div></div>
          <div className="num-row"><div className="n">{pendente}</div><div className="l">Pendentes</div></div>
          <div className="stat-bar"><i style={{ width: `${pct(pendente)}%` }}></i></div>
        </div>
        <div className="stat waiting" style={{ opacity: 1, transform: 'none' }}>
          <div className="top-row"><div className="stat-icon">⏳</div></div>
          <div className="num-row"><div className="n">{espera}</div><div className="l">Em espera</div></div>
          <div className="stat-bar"><i style={{ width: `${pct(espera)}%` }}></i></div>
        </div>
        <div className="stat corrected" style={{ opacity: 1, transform: 'none' }}>
          <div className="top-row"><div className="stat-icon">🏆</div></div>
          <div className="num-row"><div className="n">{corrigido}</div><div className="l">Corrigidos</div></div>
          <div className="stat-bar"><i style={{ width: `${pct(corrigido)}%` }}></i></div>
        </div>
      </div>

      <div className="toolbar">
        <input type="text" id="searchBox" placeholder="Buscar por SKU, descrição, observação ou responsável…" value={search} onChange={e => setSearch(e.target.value)} />
        <select id="filterSetor" value={filterSetor} onChange={e => setFilterSetor(e.target.value)}>
          <option value="">Todos os setores</option>
          {sectors.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
        </select>
        <select id="filterStatus" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">Todos os status</option>
          {statuses.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
        </select>
        <select id="filterDiv" value={filterDiv} onChange={e => setFilterDiv(e.target.value)}>
          <option value="">Toda divergência</option>
          {divergences.map(o => <option key={o.id} value={o.id}>{stripDivCode(o.name)}</option>)}
        </select>
        <div className="spacer"></div>
        <button className="btn ghost small" onClick={exportCSV}>Exportar CSV</button>
        <button className="btn amber" onClick={() => openModal(null)}>+ Novo registro</button>
      </div>

      <div className="table-wrap">
        <div className="scroll-hint">⟷ arraste para o lado para ver todas as colunas</div>
        <div className="table-card">
          <table id="mainTable">
            <thead>
              <tr>
                <th>Data</th>
                <th>Setor</th>
                <th>Produto</th>
                <th>Qtd</th>
                <th>Divergência</th>
                <th>Observação / Ação</th>
                <th>Status</th>
                <th>Resp.</th>
                <th></th>
              </tr>
            </thead>
            <tbody id="tbody">
              {filteredRecords.map(r => {
                const isCorrigido = r.status_name === 'CORRIGIDO' || r.status_name === 'Corrigido';
                const isEspera = r.status_name === 'EM ESPERA' || r.status_name === 'Em Espera';
                
                return (
                <tr key={r.id} className={isCorrigido ? 'status-corrigido' : isEspera ? 'status-espera' : 'status-pendente'}>
                  <td className="mono">{fmtDate(r.observation_date)}</td>
                  <td>{r.sector_name || r.sector_id}</td>
                  <td className="desc-cell">
                    {r.product_name ? r.product_name : <em style={{ color: 'var(--ink-soft)' }}>Sem produto vinculado</em>}
                    {r.product_sku && <span className="sku mono">{r.product_sku}</span>}
                  </td>
                  <td>{r.quantity || 0}</td>
                  <td><span className="divcode">{stripDivCode(r.divergence_type_name || String(r.divergence_type_id)) || '—'}</span></td>
                  <td className="obs-cell">
                    <div>{r.observation}</div>
                    {r.correction_action && <div className="hint">↳ {r.correction_action}</div>}
                  </td>
                  <td>
                    <span className={`badge ${isCorrigido ? 'corrigido' : isEspera ? 'espera' : 'pendente'}`}>
                      <span className="status-dot"></span>{r.status_name || r.status_id}
                    </span>
                  </td>
                  <td>{r.responsible}</td>
                  <td>
                    <div className="row-actions">
                      <button className="btn ghost small" onClick={() => openModal(r.id || null)}>Editar</button>
                      <button className="btn ghost small" onClick={() => deleteRecord(r.id || 0)}>Excluir</button>
                    </div>
                  </td>
                </tr>
              )})}
            </tbody>
          </table>
          {filteredRecords.length === 0 && (
            <div className="empty" id="emptyState">
              <div className="display">Nenhum registro encontrado</div>
              <div>Ajuste os filtros ou cadastre um novo registro de qualidade.</div>
            </div>
          )}
        </div>
      </div>

      <footer className="foot">
        <span>Catálogo de produtos: <strong>{products.length.toLocaleString('pt-BR')}</strong> SKUs carregados.</span>
        <span>Os dados são sincronizados com o backend (API).</span>
      </footer>

      {isModalOpen && (
        <div className="overlay open" id="overlay" onClick={(e) => { if ((e.target as any).id === 'overlay') setIsModalOpen(false); }}>
          <div className="modal">
            <header>
              <h2>{editingId ? 'Editar registro' : 'Novo registro de divergência'}</h2>
              <button aria-label="Fechar" onClick={() => setIsModalOpen(false)}>×</button>
            </header>
            <div className="body">
              <div className="grid2">
                <div className="field">
                  <label>Setor</label>
                  <select value={fSetorId} onChange={e => setFSetorId(Number(e.target.value))}>
                    <option value="">Selecione...</option>
                    {sectors.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label>Status</label>
                  <select value={fStatusId} onChange={e => setFStatusId(Number(e.target.value))}>
                    <option value="">Selecione...</option>
                    {statuses.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="field">
                <label>Produto (busque por descrição ou código SKU)</label>
                <input
                  type="text"
                  placeholder="Ex.: CE ESPECIAL 088 X 188 ou código SKU…"
                  autoComplete="off"
                  value={productSearch}
                  onChange={e => handleSearchProduct(e.target.value)}
                  onKeyDown={e => {
                    if (autoResults.length === 0) return;
                    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveAutoIndex(Math.min(activeAutoIndex + 1, autoResults.length - 1)); }
                    else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveAutoIndex(Math.max(activeAutoIndex - 1, 0)); }
                    else if (e.key === 'Enter') { e.preventDefault(); if (activeAutoIndex >= 0) { setSelectedProduct(autoResults[activeAutoIndex]); setAutoResults([]); setProductSearch(''); setFFornecedorId(autoResults[activeAutoIndex].supplier_id || ''); } }
                    else if (e.key === 'Escape') { setAutoResults([]); }
                  }}
                />
                {autoResults.length > 0 && (
                  <div className="autolist" style={{ display: 'block' }}>
                    {autoResults.map((p, i) => (
                      <div key={p.id} className={i === activeAutoIndex ? 'active' : ''} onClick={() => { setSelectedProduct(p); setAutoResults([]); setProductSearch(''); setFFornecedorId(p.supplier_id || ''); }}>
                        <div className="d-desc">{p.name}</div>
                        <div className="d-meta">{p.sku} · {p.supplier_name || 'sem fornecedor'}</div>
                      </div>
                    ))}
                  </div>
                )}
                {selectedProduct && (
                  <div id="selectedProductBox">
                    <div className="selected-chip">
                      <span><strong>{selectedProduct.name}</strong> <span className="mono" style={{ color: 'var(--ink-soft)' }}>({selectedProduct.sku})</span></span>
                      <span className="x" title="Remover" onClick={() => { setSelectedProduct(null); setFFornecedorId(''); }}>×</span>
                    </div>
                  </div>
                )}
                <div className="hint">Também é possível deixar sem produto vinculado (ex.: divergência de pallet/gaiola).</div>
              </div>

              <div className="grid2">
                <div className="field">
                  <label>Quantidade</label>
                  <input type="number" value={fQtd} onChange={e => setFQtd(Number(e.target.value))} min="0" step="1" />
                </div>
                <div className="field">
                  <label>Fornecedor</label>
                  <select value={fFornecedorId} onChange={e => setFFornecedorId(Number(e.target.value))}>
                    <option value="">Nenhum ou selecione...</option>
                    {suppliers.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="field">
                <label>Divergência</label>
                <select value={fCodDivId} onChange={e => setFCodDivId(Number(e.target.value))}>
                  <option value="">Selecione...</option>
                  {divergences.map(o => <option key={o.id} value={o.id}>{stripDivCode(o.name)}</option>)}
                </select>
              </div>

              <div className="field">
                <label>Observação</label>
                <textarea placeholder="Descreva o problema encontrado…" value={fObs} onChange={e => setFObs(e.target.value)}></textarea>
              </div>

              <div className="field">
                <label>Ação de correção</label>
                <textarea placeholder="Descreva a ação tomada / a ser tomada…" value={fAcao} onChange={e => setFAcao(e.target.value)}></textarea>
              </div>

              <div className="grid3">
                <div className="field">
                  <label>Data da observação</label>
                  <input type="date" value={fDataObs} onChange={e => setFDataObs(e.target.value)} />
                </div>
                <div className="field">
                  <label>Data da correção</label>
                  <input type="date" value={fDataCorr} onChange={e => setFDataCorr(e.target.value)} />
                </div>
                <div className="field">
                  <label>Responsável</label>
                  <input type="text" placeholder="Nome do responsável" value={fResp} onChange={e => setFResp(e.target.value)} />
                </div>
              </div>
            </div>
            <footer>
              <button className="btn ghost" onClick={() => setIsModalOpen(false)}>Cancelar</button>
              <button className="btn amber" onClick={saveRecord}>Salvar registro</button>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
}
