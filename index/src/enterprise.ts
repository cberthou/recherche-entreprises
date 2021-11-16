import agreements from "@socialgouv/kali-data/data/index.json";

import { codesNaf } from "./naf";

const ccMap = new Map(agreements.map((agg) => [agg.num, agg]));

export type Enterprise = {
  siren: string;
  trancheEffectifsUniteLegale: number;

  nomUniteLegale: string;
  nomUsageUniteLegale: string;
  sigleUniteLegale: string;

  denominationUniteLegale: string;
  denominationUsuelle1UniteLegale: string;
  denominationUsuelle2UniteLegale: string;
  denominationUsuelle3UniteLegale: string;

  enseigne1Etablissement: string;
  enseigne2Etablissement: string;
  enseigne3Etablissement: string;
  denominationUsuelleEtablissement: string;

  etablissements: number;

  categorieJuridiqueUniteLegale: string;
  activitePrincipaleUniteLegale: string;
  activitePrincipaleEtablissement: string;

  nomenclatureActivitePrincipaleUniteLegale: string;
  siret: string;
  codePostalEtablissement: string;
  libelleCommuneEtablissement: string;

  // MOIS: '2020-07',
  // DATE_MAJ: '2020/08/28'

  idcc: string | undefined;
  geo_adresse: string;

  categorieEntreprise: string;
  etatAdministratifUniteLegale: string;
  caractereEmployeurUniteLegale: string;
  etatAdministratifEtablissement: string;

  complementAdresseEtablissement: string;
  numeroVoieEtablissement: string;
  indiceRepetitionEtablissement: string;
  typeVoieEtablissement: string;
  libelleVoieEtablissement: string;
};

// geo_siret.geo_adresse,

export const mappings = {
  properties: {
    activitePrincipale: { type: "keyword" },
    activitePrincipaleEtablissement: { type: "keyword" },
    activitePrincipaleUniteLegale: { type: "keyword" },

    caractereEmployeurUniteLegale: { type: "keyword" },
    categorieEntreprise: { type: "keyword" },

    categorieJuridiqueUniteLegale: { type: "keyword" },
    codePostalEtablissement: { type: "keyword" },
    convention: { type: "keyword" },
    cp: { type: "keyword" },
    denominationUniteLegale: { type: "keyword" },

    denominationUsuelle1UniteLegale: { type: "keyword" },
    denominationUsuelle2UniteLegale: { type: "keyword" },
    denominationUsuelle3UniteLegale: { type: "keyword" },
    denominationUsuelleEtablissement: { type: "keyword" },

    enseigne1Etablissement: { type: "keyword" },

    enseigne2Etablissement: { type: "keyword" },
    enseigne3Etablissement: { type: "keyword" },

    etablissements: { type: "rank_feature" },

    etatAdministratifEtablissement: { type: "keyword" },
    etatAdministratifUniteLegale: { type: "keyword" },
    codeCommuneEtablissement: { type: "keyword" },
    departementEtablissement: { type: "keyword" },

    geo_adresse: {
      analyzer: "french_indexing",
      type: "text",
    },

    idcc: {
      fields: {
        number: {
          type: "integer",
        },
      },
      type: "keyword",
    },

    libelleCommuneEtablissement: {
      analyzer: "french_indexing",
      type: "text",
    },

    naming: {
      analyzer: "french_indexing",
      similarity: "bm25_no_norm_length",
      type: "text",
    },

    nomUniteLegale: { type: "keyword" },

    nomUsageUniteLegale: { type: "keyword" },

    nomenclatureActivitePrincipaleUniteLegale: { type: "keyword" },
    sigleUniteLegale: { type: "keyword" },
    siren: { type: "keyword" },
    siret: { type: "keyword" },

    siretRank: { type: "rank_feature" },
    trancheEffectifsUniteLegale: { type: "rank_feature" },

    withIdcc: { type: "boolean" },
  },
};

const buildAddress = (enterprise: Enterprise) => {
  if (enterprise.geo_adresse) {
    return enterprise.geo_adresse;
  }

  const {
    complementAdresseEtablissement,
    numeroVoieEtablissement,
    indiceRepetitionEtablissement,
    typeVoieEtablissement,
    libelleVoieEtablissement,
    codePostalEtablissement,
    libelleCommuneEtablissement,
  } = enterprise;

  return [
    complementAdresseEtablissement,
    numeroVoieEtablissement,
    indiceRepetitionEtablissement,
    typeVoieEtablissement,
    libelleVoieEtablissement,
    codePostalEtablissement,
    libelleCommuneEtablissement,
  ]
    .filter((e) => e)
    .join(" ");
};

export const mapEnterprise = (enterprise: Enterprise) => {
  // ranking feature cannot be 0

  enterprise.trancheEffectifsUniteLegale = Number.parseFloat(
    enterprise.trancheEffectifsUniteLegale as unknown as string
  ) || 0.1;

  const siretRank = enterprise.siret;

  const naming = Array.from(
    new Set([
      enterprise.nomUniteLegale,
      enterprise.nomUsageUniteLegale,
      enterprise.sigleUniteLegale,

      enterprise.denominationUniteLegale,
      enterprise.denominationUsuelle1UniteLegale,
      enterprise.denominationUsuelle2UniteLegale,
      enterprise.denominationUsuelle3UniteLegale,

      enterprise.enseigne1Etablissement,
      enterprise.enseigne2Etablissement,
      enterprise.enseigne3Etablissement,
      enterprise.denominationUsuelleEtablissement,
    ])
  )
    .filter((t) => t)
    .join(" ");

  const codeActivitePrincipale = [
    enterprise.activitePrincipaleEtablissement,
    enterprise.activitePrincipaleUniteLegale,
  ]
    .map((code) => code.replace(/\w$/, ""))
    .find((s) => !s.startsWith("00.00")); // 00.00Z is a temporary code

  const activitePrincipale =
    codeActivitePrincipale !== undefined
      ? codesNaf.get(codeActivitePrincipale)
      : undefined;

  const convention = enterprise.idcc
    ? ccMap.get(parseInt(enterprise.idcc))?.shortTitle
    : undefined;

  // TODO should we filter deprecated IDCC ? #105
  const withIdcc =
    (enterprise.idcc &&
      parseInt(enterprise.idcc) !== 0 &&
      parseInt(enterprise.idcc) !== 9999) ||
    false;

  enterprise.idcc = enterprise.idcc?.trim();

  enterprise.geo_adresse = buildAddress(enterprise);

  const departementEtablissement = enterprise.codePostalEtablissement.slice(
    0,
    +enterprise.codePostalEtablissement.slice(0, 2) > 95 ? 3 : 2
  );

  return {
    activitePrincipale,
    convention,
    naming,
    siretRank,
    withIdcc,
    departementEtablissement,
    ...Object.fromEntries(
      Object.entries(enterprise).filter(([k, v]) => k && v)
    ),
  };
};
