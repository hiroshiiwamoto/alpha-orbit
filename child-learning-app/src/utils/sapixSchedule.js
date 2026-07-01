/**
 * SAPIX 年間スケジュール → マスター単元 マッピング
 *
 * ファイル名（例: 41B-02.pdf）からテキストコードを抽出し、
 * 対応するマスター単元を自動で特定する。
 *
 * コード体系:
 *   通常授業: [学年1桁][ブロック1桁][A|B]-[連番2桁]  例: 41B-02
 *   春期講習: H[学年1桁][ブロック1桁]-[連番2桁]       例: H41-01
 *   夏期講習: N[学年1桁][ブロック1桁]-[連番2桁]       例: N41-01
 *   冬期講習: F[学年1桁][ブロック1桁]-[連番2桁]       例: F41-01
 */

// ── マッピングテーブル ──────────────────────────────────────
// key   : SAPIX テキストコード
// value : { name: テキスト名, unitIds: マスター単元IDの配列, subject: 教科 }
//
// unitIds が空配列の場合、単元タグの自動付与はスキップされる（総合回など）。
// 新しいテキストを追加する場合は、ここにエントリを追加するだけでOK。

const SAPIX_SCHEDULE = {
  // ═══ 4年生 通常授業 Aテキスト（算数）═══════════════════════
  // 41A-01 は独自テーマ、41A-02 以降は前回 B テキスト (41B-(N-1)) の復習
  '41A-01': { name: '割り算',                    unitIds: [],                    subject: '算数' },
  '41A-02': { name: '大きな数の復習',              unitIds: ['SAN_CALC_BASIC'],    subject: '算数' },
  '41A-03': { name: '角と角度①の復習',             unitIds: ['SAN_PLANE_ANGLE'],   subject: '算数' },
  '41A-04': { name: '植木算の復習',               unitIds: ['SAN_SPEC_TREE'],     subject: '算数' },
  '41A-05': { name: '場合の数①の復習',             unitIds: ['SAN_COMB_COUNT'],    subject: '算数' },
  '41A-06': { name: '総合（01～04）の復習',         unitIds: [],                    subject: '算数' },
  '41A-07': { name: '計算のくふうの復習',            unitIds: ['SAN_CALC_TRICK'],    subject: '算数' },
  '41A-08': { name: '図形のせいしつの復習',           unitIds: ['SAN_PLANE_ANGLE'],   subject: '算数' },
  '41A-09': { name: '和差算の復習',               unitIds: ['SAN_SPEC_WACHA'],    subject: '算数' },
  '41A-10': { name: '規則性の復習',               unitIds: ['SAN_PATTERN_SEQ'],   subject: '算数' },
  '41A-11': { name: '総合（06～09）の復習',         unitIds: [],                    subject: '算数' },
  '41A-12': { name: '約数の復習',                unitIds: ['SAN_NUM_DIVISOR'],   subject: '算数' },
  '41A-13': { name: '倍数の復習',                unitIds: ['SAN_NUM_DIVISOR'],   subject: '算数' },
  '41A-14': { name: '面積の考え方①の復習',           unitIds: ['SAN_PLANE_AREA'],    subject: '算数' },
  '41A-15': { name: '面積の考え方②の復習',           unitIds: ['SAN_PLANE_AREA'],    subject: '算数' },
  '41A-16': { name: '総合（11～14）の復習',         unitIds: [],                    subject: '算数' },
  '41A-17': { name: '分数の基本の復習',             unitIds: ['SAN_CALC_BASIC'],    subject: '算数' },
  '41A-18': { name: 'つるかめ算の復習',             unitIds: ['SAN_SPEC_TSURU'],    subject: '算数' },
  '41A-19': { name: '過不足算の復習',              unitIds: ['SAN_SPEC_EXCESS'],   subject: '算数' },
  '41A-20': { name: '場合の数②の復習',             unitIds: ['SAN_COMB_COUNT'],    subject: '算数' },
  '41A-21': { name: '和差算とやりとり算の復習',        unitIds: ['SAN_SPEC_WACHA'],    subject: '算数' },
  '41A-22': { name: '消去算の復習',               unitIds: ['SAN_SPEC_ELIM'],     subject: '算数' },
  '41A-23': { name: '小数の復習',                unitIds: ['SAN_CALC_BASIC'],    subject: '算数' },
  '41A-24': { name: '分数の復習',                unitIds: ['SAN_CALC_BASIC'],    subject: '算数' },
  '41A-25': { name: '総合（20～23）の復習',         unitIds: [],                    subject: '算数' },
  '41A-26': { name: '方陣算の復習',               unitIds: ['SAN_SPEC_SQUARE'],   subject: '算数' },
  '41A-27': { name: '平均算の復習',               unitIds: ['SAN_SPEC_AVG'],      subject: '算数' },
  '41A-28': { name: '円とおうぎ形①の復習',           unitIds: ['SAN_PLANE_CIRCLE'],  subject: '算数' },
  '41A-29': { name: '円とおうぎ形②の復習',           unitIds: ['SAN_PLANE_CIRCLE'],  subject: '算数' },
  '41A-30': { name: '総合（25～28）の復習',         unitIds: [],                    subject: '算数' },
  '41A-31': { name: '深さの変化の復習',             unitIds: ['SAN_SOLID_WATER'],   subject: '算数' },
  '41A-32': { name: 'グラフの読み取り方の復習',        unitIds: ['SAN_LOGIC_GRAPH'],   subject: '算数' },
  '41A-33': { name: '規則性の復習',               unitIds: ['SAN_PATTERN_SEQ'],   subject: '算数' },
  '41A-34': { name: '速さの復習',                unitIds: ['SAN_SPEED_BASIC'],   subject: '算数' },
  '41A-35': { name: '総合（30～33）の復習',         unitIds: [],                    subject: '算数' },
  '41A-36': { name: '文章題の復習',               unitIds: [],                    subject: '算数' },

  // ═══ 4年生 通常授業 Bテキスト（算数）═══════════════════════
  '41B-01': { name: '大きな数',           unitIds: ['SAN_CALC_BASIC'],    subject: '算数' },
  '41B-02': { name: '角と角度①',         unitIds: ['SAN_PLANE_ANGLE'],   subject: '算数' },
  '41B-03': { name: '植木算',             unitIds: ['SAN_SPEC_TREE'],     subject: '算数' },
  '41B-04': { name: '場合の数①',         unitIds: ['SAN_COMB_COUNT'],    subject: '算数' },
  '41B-05': { name: '総合（01～04）',     unitIds: [],                    subject: '算数' },
  '41B-06': { name: '計算のくふう',       unitIds: ['SAN_CALC_TRICK'],    subject: '算数' },
  '41B-07': { name: '図形のせいしつ',     unitIds: ['SAN_PLANE_ANGLE'],   subject: '算数' },
  '41B-08': { name: '和差算',             unitIds: ['SAN_SPEC_WACHA'],    subject: '算数' },
  '41B-09': { name: '規則性',             unitIds: ['SAN_PATTERN_SEQ'],   subject: '算数' },
  '41B-10': { name: '総合（06～09）',     unitIds: [],                    subject: '算数' },
  '41B-11': { name: '約数',               unitIds: ['SAN_NUM_DIVISOR'],   subject: '算数' },
  '41B-12': { name: '倍数',               unitIds: ['SAN_NUM_DIVISOR'],   subject: '算数' },
  '41B-13': { name: '面積の考え方①',     unitIds: ['SAN_PLANE_AREA'],    subject: '算数' },
  '41B-14': { name: '面積の考え方②',     unitIds: ['SAN_PLANE_AREA'],    subject: '算数' },
  '41B-15': { name: '総合（11～14）',     unitIds: [],                    subject: '算数' },
  '41B-16': { name: '分数の基本',         unitIds: ['SAN_CALC_BASIC'],    subject: '算数' },
  '41B-17': { name: 'つるかめ算',         unitIds: ['SAN_SPEC_TSURU'],    subject: '算数' },
  '41B-18': { name: '過不足算',           unitIds: ['SAN_SPEC_EXCESS'],   subject: '算数' },
  '41B-19': { name: '場合の数②',         unitIds: ['SAN_COMB_COUNT'],    subject: '算数' },
  '41B-20': { name: '和差算とやりとり算', unitIds: ['SAN_SPEC_WACHA'],    subject: '算数' },
  '41B-21': { name: '消去算',             unitIds: ['SAN_SPEC_ELIM'],     subject: '算数' },
  '41B-22': { name: '小数',               unitIds: ['SAN_CALC_BASIC'],    subject: '算数' },
  '41B-23': { name: '分数',               unitIds: ['SAN_CALC_BASIC'],    subject: '算数' },
  '41B-24': { name: '総合（20～23）',     unitIds: [],                    subject: '算数' },
  '41B-25': { name: '方陣算',             unitIds: ['SAN_SPEC_SQUARE'],   subject: '算数' },
  '41B-26': { name: '平均算',             unitIds: ['SAN_SPEC_AVG'],      subject: '算数' },
  '41B-27': { name: '円とおうぎ形①',     unitIds: ['SAN_PLANE_CIRCLE'],  subject: '算数' },
  '41B-28': { name: '円とおうぎ形②',     unitIds: ['SAN_PLANE_CIRCLE'],  subject: '算数' },
  '41B-29': { name: '総合（25～28）',     unitIds: [],                    subject: '算数' },
  '41B-30': { name: '深さの変化',         unitIds: ['SAN_SOLID_WATER'],   subject: '算数' },
  '41B-31': { name: 'グラフの読み取り方', unitIds: ['SAN_LOGIC_GRAPH'],   subject: '算数' },
  '41B-32': { name: '規則性',             unitIds: ['SAN_PATTERN_SEQ'],   subject: '算数' },
  '41B-33': { name: '速さ',               unitIds: ['SAN_SPEED_BASIC'],   subject: '算数' },
  '41B-34': { name: '総合（30～33）',     unitIds: [],                    subject: '算数' },
  '41B-35': { name: '文章題',             unitIds: [],                    subject: '算数' },
  '41B-36': { name: '平面図形',           unitIds: ['SAN_PLANE_AREA'],    subject: '算数' },

  // ═══ 4年生 春期講習（算数）═════════════════════════════════
  'H41-01': { name: 'およその数',         unitIds: ['SAN_CALC_BASIC'],    subject: '算数' },
  'H41-02': { name: '角と角度②',         unitIds: ['SAN_PLANE_ANGLE'],   subject: '算数' },
  'H41-03': { name: '数列',               unitIds: ['SAN_PATTERN_SEQ'],   subject: '算数' },
  'H41-04': { name: 'すい理算',           unitIds: ['SAN_LOGIC_COND'],    subject: '算数' },
  'H41-05': { name: '春期講習総合',       unitIds: [],                    subject: '算数' },

  // ═══ 4年生 夏期講習（算数）═════════════════════════════════
  'N41-01': { name: '平面図形①',         unitIds: ['SAN_PLANE_ANGLE'],   subject: '算数' },
  'N41-02': { name: '平面図形②',         unitIds: ['SAN_PLANE_AREA'],    subject: '算数' },
  'N41-03': { name: '約数',               unitIds: ['SAN_NUM_DIVISOR'],   subject: '算数' },
  'N41-04': { name: '倍数',               unitIds: ['SAN_NUM_DIVISOR'],   subject: '算数' },
  'N41-05': { name: '規則性',             unitIds: ['SAN_PATTERN_SEQ'],   subject: '算数' },
  'N41-06': { name: '小数',               unitIds: ['SAN_CALC_BASIC'],    subject: '算数' },
  'N41-07': { name: '分数',               unitIds: ['SAN_CALC_BASIC'],    subject: '算数' },
  'N41-08': { name: '文章題①',           unitIds: [],                    subject: '算数' },
  'N41-09': { name: '立体図形①',         unitIds: ['SAN_SOLID_BASIC'],   subject: '算数' },
  'N41-10': { name: '立体図形②',         unitIds: ['SAN_SOLID_VOLUME'],  subject: '算数' },
  'N41-11': { name: '場合の数①',         unitIds: ['SAN_COMB_COUNT'],    subject: '算数' },
  'N41-12': { name: '文章題②',           unitIds: [],                    subject: '算数' },
  'N41-13': { name: '立体図形③',         unitIds: ['SAN_SOLID_VOLUME'],  subject: '算数' },
  'N41-14': { name: '場合の数②',         unitIds: ['SAN_COMB_COUNT'],    subject: '算数' },

  // ═══ 4年生 冬期講習（算数）═════════════════════════════════
  'F41-01': { name: '平面図形①',         unitIds: ['SAN_PLANE_ANGLE'],   subject: '算数' },
  'F41-02': { name: '数のせいしつ',       unitIds: ['SAN_NUM_DIVISOR'],   subject: '算数' },
  'F41-03': { name: '平面図形②',         unitIds: ['SAN_PLANE_AREA'],    subject: '算数' },
  'F41-04': { name: '場合の数',           unitIds: ['SAN_COMB_COUNT'],    subject: '算数' },
  'F41-05': { name: '立体図形',           unitIds: ['SAN_SOLID_BASIC'],   subject: '算数' },
  'F41-06': { name: '総合（01～05）',     unitIds: [],                    subject: '算数' },

  // ═══ 4年生 通常授業（理科）══════════════════════════════════
  '430-01': { name: '磁石の性質',         unitIds: ['RIK_PHY_MAGNET'],        subject: '理科' },
  '430-02': { name: '電気の性質',         unitIds: ['RIK_PHY_CIRCUIT_BASIC'], subject: '理科' },
  '430-03': { name: '電磁石のはたらき',   unitIds: ['RIK_PHY_MAGNET'],        subject: '理科' },
  '430-04': { name: '昆虫①',             unitIds: ['RIK_BIO_INSECT'],        subject: '理科' },
  '430-05': { name: 'メダカの生態',       unitIds: ['RIK_BIO_FISH'],          subject: '理科' },
  '430-06': { name: '食物連鎖',           unitIds: ['RIK_BIO_ECOLOGY'],       subject: '理科' },
  '430-07': { name: '酸素の性質',         unitIds: ['RIK_CHE_GAS_BASIC'],     subject: '理科' },
  '430-08': { name: '二酸化炭素の性質',   unitIds: ['RIK_CHE_GAS_BASIC'],     subject: '理科' },
  '430-09': { name: '気体の発生',         unitIds: ['RIK_CHE_GAS_BASIC'],     subject: '理科' },
  '430-10': { name: '植物のはたらき①',   unitIds: ['RIK_BIO_PHOTO'],         subject: '理科' },
  '430-11': { name: '植物のはたらき②',   unitIds: ['RIK_BIO_PHOTO'],         subject: '理科' },
  '430-12': { name: '生き物のつながり',   unitIds: ['RIK_BIO_ECOLOGY'],       subject: '理科' },
  '430-13': { name: '水溶液①',           unitIds: ['RIK_CHE_DISSOLVE'],      subject: '理科' },
  '430-14': { name: '水溶液②',           unitIds: ['RIK_CHE_ACID'],          subject: '理科' },
  '430-15': { name: '水溶液③',           unitIds: ['RIK_CHE_NEUTRAL'],       subject: '理科' },
  '430-16': { name: '花と受粉',           unitIds: ['RIK_BIO_FLOWER'],        subject: '理科' },
  '430-17': { name: '種子と発芽',         unitIds: ['RIK_BIO_PLANT_GROW'],    subject: '理科' },
  '430-18': { name: '生き物の増え方',     unitIds: ['RIK_BIO_ECOLOGY'],       subject: '理科' },
  '430-19': { name: '植物の分類',         unitIds: ['RIK_BIO_PLANT_CLASS'],   subject: '理科' },
  '430-20': { name: '地層①',             unitIds: ['RIK_GEO_LAYER'],         subject: '理科' },
  '430-21': { name: '地層②',             unitIds: ['RIK_GEO_LAYER'],         subject: '理科' },
  '430-22': { name: '地面の動き',         unitIds: ['RIK_GEO_QUAKE'],         subject: '理科' },
  '430-23': { name: '膨張と収縮',         unitIds: ['RIK_PHY_EXPAND'],        subject: '理科' },
  '430-24': { name: '水の三態①',         unitIds: ['RIK_CHE_STATE'],         subject: '理科' },
  '430-25': { name: '熱の伝わり方',       unitIds: ['RIK_PHY_HEAT'],          subject: '理科' },
  '430-26': { name: '光の性質',           unitIds: ['RIK_PHY_MIRROR'],        subject: '理科' },
  '430-27': { name: '水の三態②',         unitIds: ['RIK_CHE_STATE'],         subject: '理科' },
  '430-28': { name: '気象',               unitIds: ['RIK_GEO_WEATHER'],       subject: '理科' },
  '430-29': { name: '太陽②',             unitIds: ['RIK_GEO_SUN_DAY'],      subject: '理科' },
  '430-30': { name: '太陽③',             unitIds: ['RIK_GEO_SUN_YEAR'],     subject: '理科' },
  '430-31': { name: '太陽④',             unitIds: ['RIK_GEO_SUN_YEAR'],     subject: '理科' },
  '430-32': { name: '植物のはたらき③',   unitIds: ['RIK_BIO_PHOTO'],         subject: '理科' },
  '430-33': { name: '昆虫③',             unitIds: ['RIK_BIO_INSECT_SEAS'],   subject: '理科' },
  '430-34': { name: '生き物の分類②',     unitIds: ['RIK_BIO_ANIMAL'],        subject: '理科' },
  '430-35': { name: '栄養素',             unitIds: ['RIK_BIO_DIGEST'],        subject: '理科' },
  '430-36': { name: '動物の分類',         unitIds: ['RIK_BIO_ANIMAL'],        subject: '理科' },

  // ═══ 4年生 春期講習（理科）═════════════════════════════════
  'H43-01': { name: '太陽①',             unitIds: ['RIK_GEO_SUN_DAY'],      subject: '理科' },
  'H43-02': { name: '星①',               unitIds: ['RIK_GEO_STAR'],          subject: '理科' },
  'H43-03': { name: '天体総合',           unitIds: [],                        subject: '理科' },

  // ═══ 4年生 夏期講習（理科）═════════════════════════════════
  'N43-01': { name: '昆虫②',             unitIds: ['RIK_BIO_INSECT_SEAS'],   subject: '理科' },
  'N43-02': { name: '生き物の分類①',     unitIds: ['RIK_BIO_ANIMAL'],        subject: '理科' },
  'N43-03': { name: '星②',               unitIds: ['RIK_GEO_STAR'],          subject: '理科' },
  'N43-04': { name: '星③',               unitIds: ['RIK_GEO_STAR'],          subject: '理科' },
  'N43-05': { name: '星④',               unitIds: ['RIK_GEO_STAR'],          subject: '理科' },
  'N43-06': { name: 'ばねの性質',         unitIds: ['RIK_PHY_SCALE'],         subject: '理科' },
  'N43-07': { name: 'てこ①',             unitIds: ['RIK_PHY_LEVER'],         subject: '理科' },
  'N43-08': { name: 'てこ②',             unitIds: ['RIK_PHY_LEVER'],         subject: '理科' },

  // ═══ 4年生 冬期講習（理科）═════════════════════════════════
  'F43-01': { name: '電気回路①',         unitIds: ['RIK_PHY_CIRCUIT_BASIC'], subject: '理科' },
  'F43-02': { name: '電気回路②',         unitIds: ['RIK_PHY_CIRCUIT'],       subject: '理科' },
  'F43-03': { name: '電気回路③',         unitIds: ['RIK_PHY_CIRCUIT'],       subject: '理科' },

  // ═══ 4年生 通常授業（社会）══════════════════════════════════
  '440-01': { name: '紙と生活',                             unitIds: ['SHA_GEO_LIFE'],      subject: '社会' },
  '440-02': { name: '日本の住居',                           unitIds: ['SHA_GEO_LIFE'],      subject: '社会' },
  '440-03': { name: '日本の衣服',                           unitIds: ['SHA_GEO_LIFE'],      subject: '社会' },
  '440-04': { name: '電気エネルギー',                       unitIds: ['SHA_GEO_RESOURCE'],  subject: '社会' },
  '440-05': { name: '自動車産業',                           unitIds: ['SHA_GEO_INDUSTRY'],  subject: '社会' },
  '440-06': { name: '商店と流通',                           unitIds: ['SHA_GEO_TRADE'],     subject: '社会' },
  '440-07': { name: '日本の国土',                           unitIds: ['SHA_GEO_LAND'],      subject: '社会' },
  '440-08': { name: '日本の気候',                           unitIds: ['SHA_GEO_CLIMATE'],   subject: '社会' },
  '440-09': { name: '地図の見方①',                         unitIds: ['SHA_GEO_MAP'],       subject: '社会' },
  '440-10': { name: '地図の見方②',                         unitIds: ['SHA_GEO_MAP'],       subject: '社会' },
  '440-11': { name: '北海道地方',                           unitIds: ['SHA_GEO_HOKKAIDO'],  subject: '社会' },
  '440-12': { name: '東北地方',                             unitIds: ['SHA_GEO_TOHOKU'],    subject: '社会' },
  '440-13': { name: '関東地方',                             unitIds: ['SHA_GEO_KANTO'],     subject: '社会' },
  '440-14': { name: '中部地方①',                           unitIds: ['SHA_GEO_CHUBU'],     subject: '社会' },
  '440-15': { name: '中部地方②',                           unitIds: ['SHA_GEO_CHUBU'],     subject: '社会' },
  '440-16': { name: '近畿地方',                             unitIds: ['SHA_GEO_KINKI'],     subject: '社会' },
  '440-17': { name: '中国・四国地方',                       unitIds: ['SHA_GEO_CHUGOKU'],   subject: '社会' },
  '440-18': { name: '九州地方',                             unitIds: ['SHA_GEO_KYUSHU'],    subject: '社会' },
  '440-19': { name: '世界の中の日本',                       unitIds: ['SHA_NEWS_WORLD'],    subject: '社会' },
  '440-20': { name: 'お米の国・日本',                       unitIds: ['SHA_GEO_CROP'],      subject: '社会' },
  '440-21': { name: '米作のいろいろな工夫',                 unitIds: ['SHA_GEO_CROP'],      subject: '社会' },
  '440-22': { name: '日本の米作の問題点',                   unitIds: ['SHA_GEO_CROP'],      subject: '社会' },
  '440-23': { name: 'いろいろな野菜作り',                   unitIds: ['SHA_GEO_CROP'],      subject: '社会' },
  '440-24': { name: 'いろいろな果物作り',                   unitIds: ['SHA_GEO_CROP'],      subject: '社会' },
  '440-25': { name: '麦・豆・いも類と工芸作物',             unitIds: ['SHA_GEO_CROP'],      subject: '社会' },
  '440-26': { name: '日本の畜産業',                         unitIds: ['SHA_GEO_LIVESTOCK'], subject: '社会' },
  '440-27': { name: '日本の農業の特徴',                     unitIds: ['SHA_GEO_CROP'],      subject: '社会' },
  '440-28': { name: '日本の水産業①日本と漁業',             unitIds: ['SHA_GEO_FISHERY'],   subject: '社会' },
  '440-29': { name: '日本の水産業②いろいろな漁業',         unitIds: ['SHA_GEO_FISHERY'],   subject: '社会' },
  '440-30': { name: '日本の水産業③魚を「育てる漁業」',     unitIds: ['SHA_GEO_FISHERY'],   subject: '社会' },
  '440-31': { name: '日本の森林と林業',                     unitIds: ['SHA_GEO_RESOURCE'],  subject: '社会' },
  '440-32': { name: '自然災害と防災へのとりくみ',           unitIds: ['SHA_GEO_CLIMATE'],   subject: '社会' },
  '440-33': { name: '工業の種類',                           unitIds: ['SHA_GEO_INDUSTRY'],  subject: '社会' },
  '440-34': { name: '織物・染物・和紙・文具',               unitIds: ['SHA_GEO_CRAFT'],     subject: '社会' },
  '440-35': { name: '陶磁器・漆器・その他',                 unitIds: ['SHA_GEO_CRAFT'],     subject: '社会' },
  '440-36': { name: '４年生のまとめ',                       unitIds: [],                    subject: '社会' },

  // ═══ 4年生 春期講習（社会）═════════════════════════════════
  'H44-01': { name: '米と野菜',             unitIds: ['SHA_GEO_CROP'],      subject: '社会' },
  'H44-02': { name: '魚と肉',               unitIds: ['SHA_GEO_FISHERY'],   subject: '社会' },
  'H44-03': { name: '加工食品',             unitIds: ['SHA_GEO_INDUSTRY'],  subject: '社会' },

  // ═══ 4年生 夏期講習（社会）═════════════════════════════════
  'N44-01': { name: '北海道の旅',           unitIds: ['SHA_GEO_HOKKAIDO'],  subject: '社会' },
  'N44-02': { name: '東北地方の旅',         unitIds: ['SHA_GEO_TOHOKU'],    subject: '社会' },
  'N44-03': { name: '関東地方の旅',         unitIds: ['SHA_GEO_KANTO'],     subject: '社会' },
  'N44-04': { name: '中部地方の旅',         unitIds: ['SHA_GEO_CHUBU'],     subject: '社会' },
  'N44-05': { name: '近畿地方の旅',         unitIds: ['SHA_GEO_KINKI'],     subject: '社会' },
  'N44-06': { name: '中国地方の旅',         unitIds: ['SHA_GEO_CHUGOKU'],   subject: '社会' },
  'N44-07': { name: '四国地方の旅',         unitIds: ['SHA_GEO_CHUGOKU'],   subject: '社会' },
  'N44-08': { name: '九州地方の旅',         unitIds: ['SHA_GEO_KYUSHU'],    subject: '社会' },

  // ═══ 4年生 冬期講習（社会）═════════════════════════════════
  'F44-01': { name: '金属工業と石油化学工業', unitIds: ['SHA_GEO_INDUSTRY'], subject: '社会' },
  'F44-02': { name: '機械工業',               unitIds: ['SHA_GEO_INDUSTRY'], subject: '社会' },
  'F44-03': { name: 'その他の工業',           unitIds: ['SHA_GEO_INDUSTRY'], subject: '社会' },

  // ═══ 4年生 通常授業 Aテキスト（国語）═══════════════════════
  '42A-01': { name: '知の冒険／漢字なんていらない？',         unitIds: [], subject: '国語' },
  '42A-02': { name: 'コトノハ／あいつなんてきらいだ',         unitIds: [], subject: '国語' },
  '42A-03': { name: 'コトノハ／今日は楽しいひなまつり',       unitIds: [], subject: '国語' },
  '42A-04': { name: 'コトノハ／何がおいしい？いつがおいしい？', unitIds: [], subject: '国語' },
  '42A-05': { name: 'コトノハ／かざらない言葉で…',           unitIds: [], subject: '国語' },
  '42A-06': { name: '知の冒険／へんな かんじ？',             unitIds: [], subject: '国語' },
  '42A-07': { name: '知の冒険／〇〇したのはだれだ？',         unitIds: [], subject: '国語' },
  '42A-08': { name: 'コトノハ／これからの自動車は？',         unitIds: [], subject: '国語' },
  '42A-09': { name: 'コトノハ／おにいちゃんはつらいよ',       unitIds: [], subject: '国語' },
  '42A-10': { name: 'コトノハ／雨、雨、ふれふれ',             unitIds: [], subject: '国語' },
  '42A-11': { name: 'コトノハ／宝物を見つけよう',             unitIds: [], subject: '国語' },
  '42A-12': { name: '知の冒険／言葉をバラバラにしてみよう！', unitIds: [], subject: '国語' },
  '42A-13': { name: 'コトノハ／堪忍袋の緒',                   unitIds: [], subject: '国語' },
  '42A-14': { name: 'コトノハ／星に願いを',                   unitIds: [], subject: '国語' },
  '42A-15': { name: 'コトノハ／コノハチョウ',                 unitIds: [], subject: '国語' },
  '42A-16': { name: 'コトノハ／努力は君を裏切らない',         unitIds: [], subject: '国語' },
  '42A-17': { name: '知の冒険／それでも そこに行くのかい？',   unitIds: [], subject: '国語' },
  '42A-18': { name: 'コトノハ／十五夜',                       unitIds: [], subject: '国語' },
  '42A-19': { name: 'コトノハ／夏が終わってしまう',           unitIds: [], subject: '国語' },
  '42A-20': { name: '知の冒険／とどけ、言葉たち！',           unitIds: [], subject: '国語' },
  '42A-21': { name: '漢字の成り立ち／部首',                   unitIds: [], subject: '国語' },
  '42A-22': { name: '読解メソッド・読解演習／説明文01',       unitIds: [], subject: '国語' },
  '42A-23': { name: '読解メソッド・読解演習／物語文01',       unitIds: [], subject: '国語' },
  '42A-24': { name: '読解メソッド・読解演習／物語文02',       unitIds: [], subject: '国語' },
  '42A-25': { name: '読解メソッド・読解演習／説明文02',       unitIds: [], subject: '国語' },
  '42A-26': { name: '漢字の音訓／熟語の組み立て',             unitIds: [], subject: '国語' },
  '42A-27': { name: '読解メソッド・読解演習／物語文03',       unitIds: [], subject: '国語' },
  '42A-28': { name: '読解メソッド・読解演習／物語文04',       unitIds: [], subject: '国語' },
  '42A-29': { name: '読解メソッド・読解演習／説明文03',       unitIds: [], subject: '国語' },
  '42A-30': { name: '読解メソッド・読解演習／物語文05',       unitIds: [], subject: '国語' },
  '42A-31': { name: '主語と述語／かかり受け',                 unitIds: [], subject: '国語' },
  '42A-32': { name: '読解メソッド・読解演習／物語文06',       unitIds: [], subject: '国語' },
  '42A-33': { name: '読解メソッド・読解演習／説明文04',       unitIds: [], subject: '国語' },
  '42A-34': { name: '読解メソッド・読解演習／説明文06',       unitIds: [], subject: '国語' },
  '42A-35': { name: '指示語／接続語',                         unitIds: [], subject: '国語' },
  '42A-36': { name: '読解メソッド・読解演習／物語文11',       unitIds: [], subject: '国語' },

  // ═══ 4年生 通常授業 Bテキスト（国語）═══════════════════════
  '42B-01': { name: '貝がら',                             unitIds: ['KOK_GEN_STORY'],   subject: '国語' },
  '42B-02': { name: '子ねこ',                             unitIds: ['KOK_GEN_STORY'],   subject: '国語' },
  '42B-03': { name: 'マリモのひみつ',                     unitIds: ['KOK_GEN_EXPLAIN'], subject: '国語' },
  '42B-04': { name: '手の中のもの、なあんだ？',           unitIds: ['KOK_GEN_STORY'],   subject: '国語' },
  '42B-05': { name: 'きくのせい',                         unitIds: ['KOK_GEN_STORY'],   subject: '国語' },
  '42B-06': { name: 'つるしびなの季節',                   unitIds: ['KOK_GEN_STORY'],   subject: '国語' },
  '42B-07': { name: 'エレベーターとエスカレーター',       unitIds: ['KOK_GEN_EXPLAIN'], subject: '国語' },
  '42B-08': { name: 'ウサギとウサギ',                     unitIds: ['KOK_GEN_STORY'],   subject: '国語' },
  '42B-09': { name: 'バースディ・タイム',                 unitIds: ['KOK_GEN_STORY'],   subject: '国語' },
  '42B-10': { name: 'モモ色フレンズ',                     unitIds: ['KOK_GEN_STORY'],   subject: '国語' },
  '42B-11': { name: '日本語にはどうして敬語が多いの？',   unitIds: ['KOK_GEN_EXPLAIN'], subject: '国語' },
  '42B-12': { name: '五月のはじめ、日曜日の朝',           unitIds: ['KOK_GEN_STORY'],   subject: '国語' },
  '42B-13': { name: 'もも子・ぼくの妹',                   unitIds: ['KOK_GEN_STORY'],   subject: '国語' },
  '42B-14': { name: 'ルリ色の夢',                         unitIds: ['KOK_GEN_STORY'],   subject: '国語' },
  '42B-15': { name: 'ダチョウ君がほしかったもの',         unitIds: ['KOK_GEN_EXPLAIN'], subject: '国語' },
  '42B-16': { name: '歩いて行こう',                       unitIds: ['KOK_GEN_STORY'],   subject: '国語' },
  '42B-17': { name: '祭りがやってきた',                   unitIds: ['KOK_GEN_STORY'],   subject: '国語' },
  '42B-18': { name: '七福鳥',                             unitIds: ['KOK_GEN_STORY'],   subject: '国語' },
  '42B-19': { name: '森田さんのおもしろ天気予報',         unitIds: ['KOK_GEN_EXPLAIN'], subject: '国語' },
  '42B-20': { name: 'ぼくとナギ',                         unitIds: ['KOK_GEN_STORY'],   subject: '国語' },
  '42B-21': { name: '子供たちの晩餐',                     unitIds: ['KOK_GEN_STORY'],   subject: '国語' },
  '42B-22': { name: 'スタートライン',                     unitIds: ['KOK_GEN_STORY'],   subject: '国語' },
  '42B-23': { name: 'くじびき',                           unitIds: ['KOK_GEN_EXPLAIN'], subject: '国語' },
  '42B-24': { name: 'キャラメルの木',                     unitIds: ['KOK_GEN_STORY'],   subject: '国語' },
  '42B-25': { name: '糸',                                 unitIds: ['KOK_GEN_STORY'],   subject: '国語' },
  '42B-26': { name: '倉田と、おれ',                       unitIds: ['KOK_GEN_STORY'],   subject: '国語' },
  '42B-27': { name: 'いのちってなんだ―生命と細胞',       unitIds: ['KOK_GEN_EXPLAIN'], subject: '国語' },
  '42B-28': { name: '小さな来客',                         unitIds: ['KOK_GEN_STORY'],   subject: '国語' },
  '42B-29': { name: 'おせんべ、焼けたかな',               unitIds: ['KOK_GEN_STORY'],   subject: '国語' },
  '42B-30': { name: '飛ぶ教室',                           unitIds: ['KOK_GEN_STORY'],   subject: '国語' },
  '42B-31': { name: 'おかねのない動物園',                 unitIds: ['KOK_GEN_EXPLAIN'], subject: '国語' },
  '42B-32': { name: '流れ星におねがい',                   unitIds: ['KOK_GEN_STORY'],   subject: '国語' },
  '42B-33': { name: '赤いマフラー',                       unitIds: ['KOK_GEN_STORY'],   subject: '国語' },
  '42B-34': { name: '天のシーソー',                       unitIds: ['KOK_GEN_STORY'],   subject: '国語' },
  '42B-35': { name: '峰雲へ',                             unitIds: ['KOK_GEN_STORY'],   subject: '国語' },
  '42B-36': { name: 'マイマイ新子',                       unitIds: ['KOK_GEN_STORY'],   subject: '国語' },

  // ═══ 4年生 春期講習（国語）═════════════════════════════════
  'H42-01': { name: 'コトノハ／入学式',               unitIds: [], subject: '国語' },
  'H42-02': { name: 'コトノハ／小さな大発見',         unitIds: [], subject: '国語' },
  'H42-03': { name: 'コトノハ／どうしてぼくだけ',     unitIds: [], subject: '国語' },
  'H42-04': { name: 'コトノハ／こいのぼりを見上げて', unitIds: [], subject: '国語' },

  // ═══ 4年生 夏期講習（国語）═════════════════════════════════
  'N42-01': { name: 'コトノハ／秋晴れの空のもと',         unitIds: [], subject: '国語' },
  'N42-02': { name: 'コトノハ／実りの秋に',               unitIds: [], subject: '国語' },
  'N42-03': { name: '知の冒険／日本語博士はここにいる！', unitIds: [], subject: '国語' },
  'N42-04': { name: 'コトノハ／あいさつのすすめ',         unitIds: [], subject: '国語' },
  'N42-05': { name: 'コトノハ／なごみの日？',             unitIds: [], subject: '国語' },
  'N42-06': { name: 'コトノハ／小さな芸術家',             unitIds: [], subject: '国語' },
  'N42-07': { name: 'コトノハ／髪型・今と昔',             unitIds: [], subject: '国語' },
  'N42-08': { name: '知の冒険／先生が食べられました？？', unitIds: [], subject: '国語' },
  'N42-09': { name: 'コトノハ／メリークリスマス',         unitIds: [], subject: '国語' },
  'N42-10': { name: 'コトノハ／いきもの係',               unitIds: [], subject: '国語' },
  'N42-11': { name: 'コトノハ／かけがえのない自然',       unitIds: [], subject: '国語' },
  'N42-12': { name: 'コトノハ／雪遊び',                   unitIds: [], subject: '国語' },

  // ═══ 4年生 冬期講習（国語）═════════════════════════════════
  'F42-01': { name: '読解メソッド・読解演習／物語文07', unitIds: [], subject: '国語' },
  'F42-02': { name: '読解メソッド・読解演習／物語文08', unitIds: [], subject: '国語' },
  'F42-03': { name: '品詞',                             unitIds: [], subject: '国語' },
  'F42-04': { name: '読解メソッド・読解演習／説明文05', unitIds: [], subject: '国語' },
  'F42-05': { name: '読解メソッド・読解演習／物語文09', unitIds: [], subject: '国語' },
  'F42-06': { name: '読解メソッド・読解演習／物語文10', unitIds: [], subject: '国語' },
}

// ═══ 2026年度 4年生 前期カレンダー（仙川校 D01〜D19）═══════
// 水曜 = 算数A(41A) + 算数B(41B) + 理科(430)
// 金曜 = 国語A(42A) + 国語B(42B) + 社会(440)
const SAPIX_CALENDAR_4_2026_FIRST = {
  'D01': { wed: '2026-02-11', fri: '2026-02-13' },
  'D02': { wed: '2026-02-18', fri: '2026-02-20' },
  'D03': { wed: '2026-02-25', fri: '2026-02-27' },
  'D04': { wed: '2026-03-04', fri: '2026-03-06' },
  'D05': { wed: '2026-03-11', fri: '2026-03-13' },
  'D06': { wed: '2026-03-18', fri: '2026-03-20' },
  // 3/25=3月度復習テスト, 3/27=休講, 3/28〜4/2=春期講習, 4/3=休講
  'D07': { wed: '2026-04-08', fri: '2026-04-10' },
  'D08': { wed: '2026-04-15', fri: '2026-04-17' },
  'D09': { wed: '2026-04-22', fri: '2026-04-24' },
  'D10': { wed: '2026-04-29', fri: '2026-05-01' },
  // 5/6=休講, 5/8=5月度マンスリー確認テスト
  'D11': { wed: '2026-05-13', fri: '2026-05-15' },
  'D12': { wed: '2026-05-20', fri: '2026-05-22' },
  'D13': { wed: '2026-05-27', fri: '2026-05-29' },
  'D14': { wed: '2026-06-03', fri: '2026-06-05' },
  'D15': { wed: '2026-06-10', fri: '2026-06-12' },
  // 6/17=6月度マンスリー確認テスト → D16以降は金曜が先
  'D16': { wed: '2026-06-24', fri: '2026-06-19' },
  'D17': { wed: '2026-07-01', fri: '2026-06-26' },
  'D18': { wed: '2026-07-08', fri: '2026-07-03' },
  'D19': { wed: '2026-07-15', fri: '2026-07-10' },
  // 7/17=7月度復習テスト
}

// ═══ 2026年度 4年生 後期カレンダー（仙川校 D20〜D36）═══════
// 同上の曜日割り。9月〜2027年1月までの正規授業日。
const SAPIX_CALENDAR_4_2026_SECOND = {
  'D20': { wed: '2026-09-02', fri: '2026-09-04' },
  'D21': { wed: '2026-09-09', fri: '2026-09-11' },
  'D22': { wed: '2026-09-16', fri: '2026-09-18' },
  // 9/23=休講 → D23 以降のしばらくは金曜が先
  'D23': { wed: '2026-09-30', fri: '2026-09-25' },
  'D24': { wed: '2026-10-07', fri: '2026-10-02' },
  // 10/9=10月度マンスリー確認テスト, 10/12=実力診断サピックスオープン
  'D25': { wed: '2026-10-14', fri: '2026-10-16' },
  'D26': { wed: '2026-10-21', fri: '2026-10-23' },
  'D27': { wed: '2026-10-28', fri: '2026-10-30' },
  'D28': { wed: '2026-11-04', fri: '2026-11-06' },
  // 11/11=11月度マンスリー確認テスト → D29 以降しばらく金曜が先
  'D29': { wed: '2026-11-18', fri: '2026-11-13' },
  'D30': { wed: '2026-11-25', fri: '2026-11-20' },
  'D31': { wed: '2026-12-02', fri: '2026-11-27' },
  'D32': { wed: '2026-12-09', fri: '2026-12-04' },
  // 12/11=12月度マンスリー確認テスト
  'D33': { wed: '2026-12-16', fri: '2026-12-18' },
  // 12/23, 12/25=休講, 12/26〜29 + 1/4〜5=冬期講習, 1/6=休講, 1/11=新学年組分けテスト
  'D34': { wed: '2027-01-13', fri: '2027-01-08' },
  'D35': { wed: '2027-01-20', fri: '2027-01-15' },
  'D36': { wed: '2027-01-27', fri: '2027-01-22' },
  // 1/29=1月度復習テスト（4年生最終授業）
}

// 前期＋後期を統合したカレンダー
const SAPIX_CALENDAR_4_2026 = {
  ...SAPIX_CALENDAR_4_2026_FIRST,
  ...SAPIX_CALENDAR_4_2026_SECOND,
}

// テスト日程（前期）
export const SAPIX_TESTS_4_2026_FIRST = [
  { date: '2026-03-08', name: '3月度組分けテスト' },
  { date: '2026-03-25', name: '3月度復習テスト' },
  { date: '2026-05-08', name: '5月度マンスリー確認テスト' },
  { date: '2026-06-17', name: '6月度マンスリー確認テスト' },
  { date: '2026-06-28', name: '7月度組分けテスト' },
  { date: '2026-07-17', name: '7月度復習テスト' },
]

// テスト日程（後期）
export const SAPIX_TESTS_4_2026_SECOND = [
  { date: '2026-08-28', name: '夏期講習マンスリー確認テスト' },     // 17:00-20:00
  { date: '2026-10-09', name: '10月度マンスリー確認テスト' },       // 17:00-20:00
  { date: '2026-10-12', name: '実力診断サピックスオープン' },        // 9:00-12:00 (月・祝)
  { date: '2026-11-11', name: '11月度マンスリー確認テスト' },       // 17:00-20:00 (水)
  { date: '2026-12-11', name: '12月度マンスリー確認テスト' },       // 17:00-20:00
  { date: '2027-01-11', name: '新学年組分けテスト' },               // 13:30-16:30 (月・祝)
  { date: '2027-01-29', name: '1月度復習テスト' },                  // 17:00-20:00（4年生最終）
]

// テスト日程（年間統合）
export const SAPIX_TESTS_4_2026 = [
  ...SAPIX_TESTS_4_2026_FIRST,
  ...SAPIX_TESTS_4_2026_SECOND,
]

// 春期講習日程
export const SAPIX_SPRING_4_2026 = [
  { date: '2026-03-28', day: '土' },
  { date: '2026-03-29', day: '日' },
  { date: '2026-03-30', day: '月' },
  { date: '2026-04-01', day: '水' },
  { date: '2026-04-02', day: '木' },
]

// 夏期講習日程（全14回）
// 教科割当（どの日にどの教科・テキストか）は未定のため、日付のみ登録。
// カレンダー上に「夏期講習」マーカーとして表示する。
export const SAPIX_SUMMER_4_2026 = [
  { date: '2026-07-30', day: '木' },  // 1（新コース開始）
  { date: '2026-07-31', day: '金' },  // 2
  { date: '2026-08-02', day: '日' },  // 3
  { date: '2026-08-03', day: '月' },  // 4
  { date: '2026-08-06', day: '木' },  // 5
  { date: '2026-08-07', day: '金' },  // 6
  { date: '2026-08-08', day: '土' },  // 7
  { date: '2026-08-15', day: '土' },  // 8
  { date: '2026-08-16', day: '日' },  // 9
  { date: '2026-08-18', day: '火' },  // 10
  { date: '2026-08-19', day: '水' },  // 11
  { date: '2026-08-21', day: '金' },  // 12
  { date: '2026-08-22', day: '土' },  // 13
  { date: '2026-08-23', day: '日' },  // 14
  // 8/28(金) 夏期講習マンスリー確認テスト（講習日ではないため含めない）
]

// 春期講習カレンダー（αクラス）
// 各日の授業: [9:00-10:00, 10:00-11:00, 11:00-12:00]
const SAPIX_SPRING_CALENDAR_4_2026_ALPHA = {
  '2026-03-28': ['H41-01', 'H42-01', 'H44-01'],  // 算数1, 国語1, 社会1
  '2026-03-29': ['H41-02', 'H42-02', 'H43-01'],  // 算数2, 国語2, 理科1
  '2026-03-30': ['H41-03', 'H43-02', 'H44-02'],  // 算数3, 理科2, 社会2
  '2026-04-01': ['H41-04', 'H42-03', 'H44-03'],  // 算数4, 国語3, 社会3
  '2026-04-02': ['H41-05', 'H42-04', 'H43-03'],  // 算数5, 国語4, 理科3
}

// 冬期講習日程（全6日, 9:00-12:00 60分×3コマ, 算数6/国語6/理科3/社会3）
export const SAPIX_WINTER_4_2026 = [
  { date: '2026-12-26', day: '土' },
  { date: '2026-12-27', day: '日' },
  { date: '2026-12-28', day: '月' },
  { date: '2026-12-29', day: '火' },
  { date: '2027-01-04', day: '月' },
  { date: '2027-01-05', day: '火' },
]

// 冬期講習カレンダー（αクラス想定 — 春期と同様の配分推定）
// 各日 3 コマ。算数 F41-01〜06, 国語 F42-01〜06, 理科 F43-01〜03, 社会 F44-01〜03。
// 注: 日別の正確な順序は PDF 未掲載のため、春期と同じパターン（理科/社会を交互）を採用。
const SAPIX_WINTER_CALENDAR_4_2026_ALPHA = {
  '2026-12-26': ['F41-01', 'F42-01', 'F44-01'],  // 算数1, 国語1, 社会1
  '2026-12-27': ['F41-02', 'F42-02', 'F43-01'],  // 算数2, 国語2, 理科1
  '2026-12-28': ['F41-03', 'F42-03', 'F44-02'],  // 算数3, 国語3, 社会2
  '2026-12-29': ['F41-04', 'F42-04', 'F43-02'],  // 算数4, 国語4, 理科2
  '2027-01-04': ['F41-05', 'F42-05', 'F44-03'],  // 算数5, 国語5, 社会3
  '2027-01-05': ['F41-06', 'F42-06', 'F43-03'],  // 算数6, 国語6, 理科3
}

// ── 正規表現 ────────────────────────────────────────────────
// 通常: 41B-02, 430-01 / 季節講習: H41-01, N43-03, F43-02
const CODE_REGEX = /(\d{2}[A-B]-\d{2}|\d{3}-\d{2}|[HNF]\d{2}-\d{2})/

/**
 * ファイル名から SAPIX テキストコードを抽出する
 * @param {string} filename - 例: "41B-02.pdf", "H41-03.pdf"
 * @returns {string|null} - 例: "41B-02" or null
 */
export function extractSapixCode(filename) {
  const match = filename.match(CODE_REGEX)
  return match ? match[1] : null
}

/**
 * テキストコードからスケジュール情報を取得する
 * @param {string} code - 例: "41B-02"
 * @returns {{ name: string, unitIds: string[], subject: string }|null}
 */
export function lookupSapixSchedule(code) {
  return SAPIX_SCHEDULE[code] || null
}

/**
 * テキストコードから学年を推定する
 * @param {string} code - 例: "41B-02" → "4年生", "H41-01" → "4年生"
 * @returns {string|null}
 */
export function gradeFromCode(code) {
  // 通常: "41B-02" → charAt(0)='4' / 季節講習: "H41-01" → charAt(1)='4'
  const gradeChar = /^[HNF]/.test(code) ? code.charAt(1) : code.charAt(0)
  const gradeMap = { '3': '3年生', '4': '4年生', '5': '5年生', '6': '6年生' }
  return gradeMap[gradeChar] || null
}

/**
 * テキストコードから授業日（学習日）を自動取得する
 * 水曜 = 算数A(41A) + 算数B(41B) + 理科(43x), 金曜 = 国語A(42A) + 国語B(42B) + 社会(44x)
 * @param {string} code - 例: "41B-02", "430-03", "42A-01", "440-01"
 * @returns {string|null} - 例: "2026-02-18" or null
 */
export function getStudyDateFromCode(code) {
  // テキストコードから連番を抽出
  const numMatch = code.match(/^(?:41[AB]|42[AB]|43\d|44\d)-(\d{2})$/)
  if (!numMatch) return null
  const num = parseInt(numMatch[1])
  if (num < 1 || num > 36) return null
  const dKey = `D${String(num).padStart(2, '0')}`
  const cal = SAPIX_CALENDAR_4_2026[dKey]
  if (!cal) return null
  // 算数A (41A) + 算数B (41B) + 理科 (43x) → 水曜
  if (/^41[AB]-|^43\d-/.test(code)) return cal.wed
  // 国語A (42A) + 国語B (42B) + 社会 (44x) → 金曜
  if (/^42[AB]-|^44\d-/.test(code)) return cal.fri
  return null
}

/**
 * 2026年度 前期 全授業セッション一覧を生成する
 * 水曜 = 算数A + 算数B + 理科, 金曜 = 国語A + 国語B + 社会
 * @returns {Array<{ date: string, dNumber: string, subject: string, textCode: string, name: string, unitIds: string[] }>}
 */
export function generateSapixSessions() {
  const sessions = []
  for (const [dNum, dates] of Object.entries(SAPIX_CALENDAR_4_2026)) {
    const num = dNum.replace('D', '')
    const sansuACode = `41A-${num}`
    const sansuBCode = `41B-${num}`
    const kokugoACode = `42A-${num}`
    const kokugoBCode = `42B-${num}`
    const rikaCode = `430-${num}`
    const shakaiCode = `440-${num}`
    // 水曜: 算数A + 算数B + 理科
    const sansuAInfo = SAPIX_SCHEDULE[sansuACode]
    if (sansuAInfo) {
      sessions.push({ date: dates.wed, dNumber: dNum, subject: '算数', textCode: sansuACode, name: sansuAInfo.name, unitIds: sansuAInfo.unitIds })
    }
    const sansuBInfo = SAPIX_SCHEDULE[sansuBCode]
    if (sansuBInfo) {
      sessions.push({ date: dates.wed, dNumber: dNum, subject: '算数', textCode: sansuBCode, name: sansuBInfo.name, unitIds: sansuBInfo.unitIds })
    }
    const rikaInfo = SAPIX_SCHEDULE[rikaCode]
    if (rikaInfo) {
      sessions.push({ date: dates.wed, dNumber: dNum, subject: '理科', textCode: rikaCode, name: rikaInfo.name, unitIds: rikaInfo.unitIds })
    }
    // 金曜: 国語A + 国語B + 社会
    const kokugoAInfo = SAPIX_SCHEDULE[kokugoACode]
    if (kokugoAInfo) {
      sessions.push({ date: dates.fri, dNumber: dNum, subject: '国語', textCode: kokugoACode, name: kokugoAInfo.name, unitIds: kokugoAInfo.unitIds })
    }
    const kokugoBInfo = SAPIX_SCHEDULE[kokugoBCode]
    if (kokugoBInfo) {
      sessions.push({ date: dates.fri, dNumber: dNum, subject: '国語', textCode: kokugoBCode, name: kokugoBInfo.name, unitIds: kokugoBInfo.unitIds })
    }
    const shakaiInfo = SAPIX_SCHEDULE[shakaiCode]
    if (shakaiInfo) {
      sessions.push({ date: dates.fri, dNumber: dNum, subject: '社会', textCode: shakaiCode, name: shakaiInfo.name, unitIds: shakaiInfo.unitIds })
    }
  }
  // 春期講習セッション（αクラス）
  for (const [date, codes] of Object.entries(SAPIX_SPRING_CALENDAR_4_2026_ALPHA)) {
    for (const code of codes) {
      const info = SAPIX_SCHEDULE[code]
      if (info) {
        sessions.push({ date, dNumber: '春期', subject: info.subject, textCode: code, name: info.name, unitIds: info.unitIds })
      }
    }
  }

  // 冬期講習セッション（αクラス）
  for (const [date, codes] of Object.entries(SAPIX_WINTER_CALENDAR_4_2026_ALPHA)) {
    for (const code of codes) {
      const info = SAPIX_SCHEDULE[code]
      if (info) {
        sessions.push({ date, dNumber: '冬期', subject: info.subject, textCode: code, name: info.name, unitIds: info.unitIds })
      }
    }
  }

  // 夏期講習マーカー（教科・テキスト割当は未定のため日付のみ登録）
  // textCode/subject を持たないため家庭学習タスク生成の対象外（下記参照）。
  for (const { date } of SAPIX_SUMMER_4_2026) {
    sessions.push({ date, dNumber: '夏期', subject: null, textCode: '', name: '夏期講習', unitIds: [] })
  }

  return sessions.sort((a, b) => a.date.localeCompare(b.date))
}

/**
 * 教科でフィルタした SAPIX テキストコード一覧を返す（autocomplete用）
 * @param {string} subject - 例: '算数'
 * @returns {string[]}
 */
export function getSapixCodesBySubject(subject) {
  return Object.entries(SAPIX_SCHEDULE)
    .filter(([, info]) => info.subject === subject)
    .map(([code]) => code)
}

/**
 * sapixRange オブジェクトからカバーされるマスター単元IDを計算する
 * @param {Object} sapixRange - { 算数: ['41B-01', ...], 社会: ['440-01', ...], ... }
 * @returns {string[]} - ユニークな unitId の配列
 */
export function computeCoveredUnitIds(sapixRange) {
  const unitIdSet = new Set()
  for (const codes of Object.values(sapixRange || {})) {
    for (const code of codes) {
      const info = SAPIX_SCHEDULE[code]
      if (info && info.unitIds) {
        info.unitIds.forEach(id => unitIdSet.add(id))
      }
    }
  }
  return [...unitIdSet]
}
