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
     Lookup tolerante a caixa/espaços: a alçada da requisição
     (alcada_aprovacao) e a chave salva no banco (config.alcada)
     podem divergir em maiúsculas/minúsculas. Sem isso, a config
     "some" e a requisição fica invisível em todas as abas.
  ---------------------------------------------------------- */
  function _cfgOf(alcada) {
    if (!alcada) return null;
    if (_config[alcada]) return _config[alcada];
    const key = String(alcada).trim().toLowerCase();
    const found = Object.keys(_config).find(k => String(k).trim().toLowerCase() === key);
    return found ? _config[found] : null;
  }

  /* ----------------------------------------------------------
     Obter config de uma alçada
  ---------------------------------------------------------- */
  function getConfig(alcada) {
    return _cfgOf(alcada);
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

    const cfg = _cfgOf(alcada);
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

      const cfg = _cfgOf(alcada);
      if (!cfg) {
        if (statusAtual === 'Aguardando Aprovacao da Diretoria') {
          return alcadasArr.some(r => ['diretor', 'gerente'].includes(r));
        }
        if (statusAtual === 'Aguardando Aprovacao Etapa 1' ||
            statusAtual === 'Aguardando Avaliacao de Compras') {
          return alcadasArr.some(r => ['gerente', 'supervisor'].includes(r));
        }
        // Sem config carregada para esta alçada: a Etapa 2 também precisa
        // de um fallback, senão a requisição some de todas as abas.
        if (statusAtual === 'Aguardando Aprovacao Etapa 2') {
          return alcadasArr.some(r => ['gerente', 'diretor'].includes(r));
        }
        return false;
      }
      if (!cfg.usa_dupla_aprovacao) {
        return statusAtual === 'Aguardando Aprovacao da Diretoria' &&
               alcadasArr.some(r => ['diretor', 'gerente'].includes(r));
      }
      if (statusAtual === 'Aguardando Aprovacao Etapa 1' ||
          statusAtual === 'Aguardando Avaliacao de Compras') {
        const role1 = (cfg.etapa1_role || '').toLowerCase();
        if (!role1) return alcadasArr.some(r => ['supervisor', 'gerente'].includes(r));
        return alcadasArr.includes(role1);
      }
      if (statusAtual === 'Aguardando Aprovacao Etapa 2') {
        const role2 = (cfg.etapa2_role || '').toLowerCase();
        if (!role2) return alcadasArr.some(r => ['gerente', 'diretor'].includes(r));
        return alcadasArr.includes(role2);
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

    const cfg = _cfgOf(alcada);
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
      const role1 = (cfg.etapa1_role || '').toLowerCase();
      if (!role1) return ['gerente', 'supervisor'].includes(roleUsuario);
      return roleUsuario === role1;
    }
    if (statusAtual === 'Aguardando Aprovacao Etapa 2') {
      const role2 = (cfg.etapa2_role || '').toLowerCase();
      if (!role2) return ['gerente', 'diretor'].includes(roleUsuario);
      return roleUsuario === role2;
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
    const cfg = _cfgOf(alcada);
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
    const cfg = _cfgOf(alcada);
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
