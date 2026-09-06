import { lazy, Suspense } from 'react';

const Venda = lazy(() => import('./Venda'));
const Bonificacao = lazy(() => import('./Bonificacao'));

function PageLoader() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh', opacity: 0.6 }}>
      <span>Carregando...</span>
    </div>
  );
}

function Ordens() {
  return (
    <div className="graficos-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 400px), 1fr))', gap: 16 }}>
      <div style={{ gridColumn: '1 / -1' }}>
        <Suspense fallback={<PageLoader />}>
          <Venda />
        </Suspense>
      </div>
      <div style={{ gridColumn: '1 / -1' }}>
        <Suspense fallback={<PageLoader />}>
          <Bonificacao />
        </Suspense>
      </div>
    </div>
  );
}

export default Ordens;