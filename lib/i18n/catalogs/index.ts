import { SupportedLocale } from "../locales";
import { TranslationCatalog } from "../types";
import { enCatalog } from "./en";
import { esCatalog } from "./es";
import { zhCatalog } from "./zh";
import { viCatalog } from "./vi";
import { koCatalog } from "./ko";
import { ruCatalog } from "./ru";
import { ptCatalog } from "./pt";
import { tlCatalog } from "./tl";

export const CATALOGS: Record<SupportedLocale, TranslationCatalog> = {
  en: enCatalog,
  es: esCatalog,
  zh: zhCatalog,
  vi: viCatalog,
  ko: koCatalog,
  ru: ruCatalog,
  pt: ptCatalog,
  tl: tlCatalog,
};

export {
  enCatalog,
  esCatalog,
  zhCatalog,
  viCatalog,
  koCatalog,
  ruCatalog,
  ptCatalog,
  tlCatalog,
};
