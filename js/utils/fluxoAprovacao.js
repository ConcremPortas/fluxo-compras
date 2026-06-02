/* ============================================================
   FLUXOCOMPRAS — Módulo de Fluxo de Aprovações
   Gerencia as 2 etapas sequenciais configuráveis por alçada
============================================================ */

var FluxoAprovacao = (function() {

  var _config = {};

  /* ----------------------------------------------------------
     Carregar configuração do banco
  ---------------------------------------------------------- */
  async function carregar() {
    try {
      const rows = await Storage.list(TABLES.configFluxoAprovacao).catch(() => []);
      _config = {};
      (rows || []).forEach(function(r) { _config[r.alcada] = r; });
    } catch(e) {
      console.warn('[FluxoAprovacao]', e);
    }
  }

  /* ----------------------------------------------------------
     Obter config de uma alçada
  ---------------------------------------------------------- */
  function getConfig(alcada) {
    return _config[alcada] || null;
  }

  function getAll() {
    return Object.assign({}, _config);
  }

  /* ----------------------------------------------------------
     Determinar próximo status após decisão
  ---------------------------------------------------------- */
  function proximoStatus(alcada, statusAtual, decisao) {
    if (decisao === 'devolver') return 'Devolvida ao Solicitante';
    if (decisao === 'reprovar') return 'Nao Aprovada';

    const cfg = _config[alcada];
    if (!cfg || !cfg.usa_dupla_aprovacao) return 'Em Cotacao';

    if (statusAtual === 'Aguardando Aprovacao Etapa 1' ||
        statusAtual === 'Aguardando Avaliacao de Compras') {
      return 'Aguardando Aprovacao Etapa 2';
    }
    return 'Em Cotacao';
  }

  /* ----------------------------------------------------------
     Verificar se usuário pode aprovar neste status/alçada
  ---------------------------------------------------------- */
  function podeAprovar(alcada, statusAtual, roleUsuario, nivelAlcada) {
    const HIER = ['supervisor', 'gerente', 'diretor'];

    // Role efetivo para verificação: nivel_alcada restringe admin; sem nivel → role livre
    const roleEfetivo = nivelAlcada ? nivelAlcada.toLowerCase() : roleUsuario;
    const idxEfetivo  = HIER.indexOf(roleEfetivo);

    if (nivelAlcada) {
      // Com nivel_alcada: checar se a alcada da requisição está dentro do nível do usuário
      const idxReq = HIER.indexOf((alcada || '').toLowerCase());
      if (idxEfetivo >= 0 && idxReq >= 0 && idxReq > idxEfetivo) return false;
      // Admin com nivel_alcada é tratado como aquele nível — não aprova além disso
    } else {
      // Sem nivel_alcada: admin pode tudo, supervisor não aprova nada por padrão
      if (roleUsuario === 'admin') return true;
      if (roleUsuario === 'supervisor') return false;
    }

    const cfg = _config[alcada];
    if (!cfg) {
      // Fallback sem config
      if (statusAtual === 'Aguardando Avaliacao de Compras' ||
          statusAtual === 'Aguardando Aprovacao Etapa 1' ||
          statusAtual === 'Aguardando Aprovacao Etapa 2') {
        return ['gerente', 'supervisor'].includes(roleEfetivo);
      }
      if (statusAtual === 'Aguardando Aprovacao da Diretoria') {
        return ['diretor', 'gerente'].includes(roleEfetivo);
      }
      return false;
    }
    if (!cfg.usa_dupla_aprovacao) {
      return statusAtual === 'Aguardando Aprovacao da Diretoria' &&
             ['diretor', 'gerente'].includes(roleEfetivo);
    }

    const idxEtapa1 = HIER.indexOf((cfg.etapa1_role || '').toLowerCase());
    const idxEtapa2 = HIER.indexOf((cfg.etapa2_role || '').toLowerCase());

    if (statusAtual === 'Aguardando Aprovacao Etapa 1' ||
        statusAtual === 'Aguardando Avaliacao de Compras') {
      // Pode aprovar se o nível efetivo for >= o nível exigido na etapa
      return idxEfetivo >= 0 && idxEtapa1 >= 0
        ? idxEfetivo >= idxEtapa1
        : roleEfetivo === (cfg.etapa1_role || '').toLowerCase();
    }
    if (statusAtual === 'Aguardando Aprovacao Etapa 2') {
      return idxEfetivo >= 0 && idxEtapa2 >= 0
        ? idxEfetivo >= idxEtapa2
        : roleEfetivo === (cfg.etapa2_role || '').toLowerCase();
    }
    if (statusAtual === 'Aguardando Aprovacao da Diretoria') {
      return ['diretor', 'gerente'].includes(roleEfetivo);
    }
    return false;
  }

  /* ----------------------------------------------------------
     Label descritivo da etapa atual
  ---------------------------------------------------------- */
  function labelEtapa(alcada, statusAtual) {
    const cfg = _config[alcada];
    if (!cfg) return 'Aprovação';
    if (statusAtual === 'Aguardando Aprovacao Etapa 1' ||
        statusAtual === 'Aguardando Avaliacao de Compras') {
      return cfg.etapa1_label || 'Aprovação — Etapa 1';
    }
    if (statusAtual === 'Aguardando Aprovacao Etapa 2') {
      return cfg.etapa2_label || 'Aprovação — Etapa 2';
    }
    if (statusAtual === 'Aguardando Aprovacao da Diretoria') {
      return 'Aprovação da Diretoria';
    }
    return 'Aprovação';
  }

  /* ----------------------------------------------------------
     Status inicial ao criar/reenviar requisição
  ---------------------------------------------------------- */
  function statusInicial(alcada) {
    const cfg = _config[alcada];
    if (!cfg) return 'Aguardando Aprovacao Etapa 1';
    if (!cfg.usa_dupla_aprovacao) return 'Aguardando Aprovacao da Diretoria';
    return 'Aguardando Aprovacao Etapa 1';
  }

  /* ----------------------------------------------------------
     API Pública
  ---------------------------------------------------------- */
  return {
    carregar:      carregar,
    getConfig:     getConfig,
    getAll:        getAll,
    proximoStatus: proximoStatus,
    podeAprovar:   podeAprovar,
    labelEtapa:    labelEtapa,
    statusInicial: statusInicial,
  };

})();

window.FluxoAprovacao = FluxoAprovacao;
