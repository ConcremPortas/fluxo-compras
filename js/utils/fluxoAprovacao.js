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

    // Normalizar nivelAlcada para array (compat string legada)
    const alcadasArr = !nivelAlcada ? [] :
      (Array.isArray(nivelAlcada) ? nivelAlcada : [nivelAlcada])
      .map(n => n.toLowerCase()).filter(n => HIER.includes(n));

    if (alcadasArr.length > 0) {
      // Com nivel_alcadas: checar se a alcada da requisição é uma das atribuídas ao usuário
      const alcadaReqLow = (alcada || '').toLowerCase();
      if (alcadaReqLow && !alcadasArr.includes(alcadaReqLow)) return false;

      const cfg = _config[alcada];
      if (!cfg) {
        if (statusAtual === 'Aguardando Aprovacao da Diretoria') {
          return alcadasArr.some(r => ['diretor', 'gerente'].includes(r));
        }
        if (statusAtual === 'Aguardando Aprovacao Etapa 1' ||
            statusAtual === 'Aguardando Avaliacao de Compras') {
          return alcadasArr.some(r => ['gerente', 'supervisor'].includes(r));
        }
        return false;
      }
      if (!cfg.usa_dupla_aprovacao) {
        return statusAtual === 'Aguardando Aprovacao da Diretoria' &&
               alcadasArr.some(r => ['diretor', 'gerente'].includes(r));
      }
      if (statusAtual === 'Aguardando Aprovacao Etapa 1' ||
          statusAtual === 'Aguardando Avaliacao de Compras') {
        return alcadasArr.includes((cfg.etapa1_role || '').toLowerCase());
      }
      if (statusAtual === 'Aguardando Aprovacao Etapa 2') {
        return alcadasArr.includes((cfg.etapa2_role || '').toLowerCase());
      }
      if (statusAtual === 'Aguardando Aprovacao da Diretoria') {
        return alcadasArr.some(r => ['diretor', 'gerente'].includes(r));
      }
      return false;
    } else {
      // Sem nivel_alcadas: admin pode tudo, supervisor não aprova nada por padrão
      if (roleUsuario === 'admin') return true;
      if (roleUsuario === 'supervisor') return false;
    }

    const cfg = _config[alcada];
    if (!cfg) {
      if (statusAtual === 'Aguardando Avaliacao de Compras' ||
          statusAtual === 'Aguardando Aprovacao Etapa 1' ||
          statusAtual === 'Aguardando Aprovacao Etapa 2') {
        return ['gerente', 'supervisor'].includes(roleUsuario);
      }
      if (statusAtual === 'Aguardando Aprovacao da Diretoria') {
        return ['diretor', 'gerente'].includes(roleUsuario);
      }
      return false;
    }
    if (!cfg.usa_dupla_aprovacao) {
      return statusAtual === 'Aguardando Aprovacao da Diretoria' &&
             ['diretor', 'gerente'].includes(roleUsuario);
    }
    if (statusAtual === 'Aguardando Aprovacao Etapa 1' ||
        statusAtual === 'Aguardando Avaliacao de Compras') {
      return roleUsuario === (cfg.etapa1_role || '').toLowerCase();
    }
    if (statusAtual === 'Aguardando Aprovacao Etapa 2') {
      return roleUsuario === (cfg.etapa2_role || '').toLowerCase();
    }
    if (statusAtual === 'Aguardando Aprovacao da Diretoria') {
      return ['diretor', 'gerente'].includes(roleUsuario);
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
