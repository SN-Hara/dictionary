/*
  ダミーデータ。
  将来的に Google スプレッドシートから生成した JSON / JS に差し替えられるよう、
  Dictionary / Event / EventScript の3シート相当で分離しています。
*/
window.GAME_DATA = {
  Dictionary: [
    { id:"D001", reading:"しんゆう", headword:"しんゆう", notation:"親友", description:"心から親しく付き合う友人。互いのことをよく知り、[[かけがえのない存在]]だと思える相手。", flagId:"F001" },
    { id:"D002", reading:"しんらい", headword:"しんらい", notation:"信頼", description:"相手を疑わず、まかせること。長い時間をかけて生まれる[[安心できる気持ち]]。", flagId:"" },
    { id:"D003", reading:"しんじつ", headword:"しんじつ", notation:"真実", description:"うそや偽りのないこと。本当のこと。物事の[[ありのままの姿]]。", flagId:"F002" },
    { id:"D004", reading:"しんや", headword:"しんや", notation:"深夜", description:"夜更けて、午前零時を過ぎたころ。周囲がもっとも[[静かになる時間]]。", flagId:"" },
    { id:"D005", reading:"しんごう", headword:"しんごう", notation:"信号", description:"情報を伝えるための合図。色や音などによって[[進む・止まる]]を知らせる。", flagId:"F003" },
    { id:"D006", reading:"しんろ", headword:"しんろ", notation:"進路", description:"進んでいく方向。また、これから選ぼうとしている[[道筋]]。", flagId:"" },
    { id:"D007", reading:"しんせつ", headword:"しんせつ", notation:"親切", description:"相手のことを思いやり、助けになるように振る舞うこと。[[小さな気づかい]]。", flagId:"F004" },
    { id:"D008", reading:"しんぱい", headword:"しんぱい", notation:"心配", description:"よくないことが起こらないかと気にかけること。胸の奥に[[落ち着かない感じ]]が残る。", flagId:"" },
    { id:"D009", reading:"しんこきゅう", headword:"しんこきゅう", notation:"深呼吸", description:"ゆっくりと大きく息を吸い、吐くこと。気持ちを[[整えるため]]に行うこともある。", flagId:"" },
    { id:"D010", reading:"しんぷる", headword:"しんぷる", notation:"シンプル", description:"飾りや複雑さが少なく、分かりやすいさま。必要なものだけを[[残した状態]]。", flagId:"F005" },
    { id:"D011", reading:"しんちょう", headword:"しんちょう", notation:"慎重", description:"軽々しく決めず、よく考えて行動するさま。[[確かめながら進む]]こと。", flagId:"" },
    { id:"D012", reading:"しんぴ", headword:"しんぴ", notation:"神秘", description:"人の知識だけでは説明しきれない、不思議で奥深いこと。[[まだ分からないもの]]。", flagId:"" },
    { id:"D013", reading:"しんか", headword:"しんか", notation:"進化", description:"時間の中で少しずつ変わり、以前とは異なる姿になること。[[積み重なった変化]]。", flagId:"F006" },
    { id:"D014", reading:"しんえん", headword:"しんえん", notation:"深淵", description:"非常に深い場所。転じて、簡単には底が見えない[[奥深さ]]。", flagId:"" },

    { id:"D020", reading:"かぜ", headword:"かぜ", notation:"風", description:"空気がある方向へ動くこと。目には見えないが、木の葉や布の動きから[[そこにあること]]が分かる。", flagId:"F010" },
    { id:"D021", reading:"かぜ", headword:"かぜ", notation:"風邪", description:"鼻やのどなどに症状が出る体調不良の一つ。休養をとり、[[体を休める]]ことが大切。", flagId:"" },
    { id:"D022", reading:"かざぐるま", headword:"かざぐるま", notation:"風車", description:"風を受けて羽根が回るもの。[[風の向き]]や強さによって回り方が変わる。", flagId:"" },

    { id:"D030", reading:"ゆめ", headword:"ゆめ", notation:"夢", description:"眠っている間に見る像や出来事。また、将来こうなりたいと願う[[希望]]。", flagId:"F020" },
    { id:"D031", reading:"ゆめみ", headword:"ゆめみ", notation:"夢見", description:"夢を見ること。また、夢を見ているときの[[ぼんやりした感覚]]。", flagId:"" },

    { id:"D040", reading:"あお", headword:"あお", notation:"青", description:"晴れた空や深い水を思わせる色。冷たさや静けさを感じさせる[[色彩]]。", flagId:"" },
    { id:"D041", reading:"あおぞら", headword:"あおぞら", notation:"青空", description:"青く晴れわたった空。雲が少なく、遠くまで[[ひらけて見える空]]。", flagId:"F030" },

    { id:"D050", reading:"ほし", headword:"ほし", notation:"星", description:"夜空に点のように光って見える天体。遠くにありながら[[目印になる光]]。", flagId:"F040" },
    { id:"D051", reading:"ほしぞら", headword:"ほしぞら", notation:"星空", description:"多くの星が見えている夜空。暗い場所ほど[[細かな光]]まで見つけやすい。", flagId:"" },

    { id:"D060", reading:"みち", headword:"みち", notation:"道", description:"人や車などが通るための場所。また、目的へ向かって進む[[経路]]。", flagId:"F050" },
    { id:"D061", reading:"みちくさ", headword:"みちくさ", notation:"道草", description:"目的地へまっすぐ行かず、途中で別のことをすること。[[寄り道]]。", flagId:"" },

    { id:"D070", reading:"きおく", headword:"きおく", notation:"記憶", description:"過去の経験や知識を心にとどめておくこと。また、その[[内容]]。", flagId:"F060" },
    { id:"D071", reading:"きおう", headword:"きおう", notation:"既往", description:"すでに過ぎ去ったこと。以前に経験した[[過去の事実]]。", flagId:"" },

    { id:"D080", reading:"おもいで", headword:"おもいで", notation:"思い出", description:"過去の出来事を思い返したときに浮かぶこと。人や場所と結びついた[[記憶]]。", flagId:"F070" },
    { id:"D081", reading:"おもいやり", headword:"おもいやり", notation:"思いやり", description:"相手の気持ちや立場を想像し、それに配慮すること。[[やさしい気づかい]]。", flagId:"" },

    { id:"D090", reading:"しろ", headword:"しろ", notation:"白", description:"雪や紙のような色。何も書かれていない[[余白]]を連想させる。", flagId:"" },
    { id:"D091", reading:"しろい", headword:"しろい", notation:"白い", description:"白の色をしているさま。光を多く反射して[[明るく見える]]。", flagId:"F080" },

    { id:"D100", reading:"くら", headword:"くらやみ", notation:"暗闇", description:"光がほとんどなく、周囲のものが見えにくい状態。[[先が見えない場所]]。", flagId:"F090" },
    { id:"D101", reading:"くらし", headword:"くらし", notation:"暮らし", description:"日々を過ごすこと。住むこと、食べること、働くことなどを含む[[毎日の営み]]。", flagId:"" },

    { id:"D110", reading:"がく", headword:"がくせい", notation:"学生", description:"学校などで学んでいる人。知識や技術を[[学ぶ人]]。", flagId:"" },
    { id:"D111", reading:"かく", headword:"かく", notation:"書く", description:"文字や記号を使って内容を表すこと。考えを[[形に残す]]方法の一つ。", flagId:"" },

    { id:"D120", reading:"きや", headword:"きゃく", notation:"客", description:"訪ねてきた人。招かれたり、サービスを受けたりする[[訪問者]]。", flagId:"" },
    { id:"D121", reading:"きや", headword:"きゃくしつ", notation:"客室", description:"客のために用意された部屋。宿泊施設などで[[滞在する場所]]。", flagId:"F100" },

    { id:"D130", reading:"かあ", headword:"かーど", notation:"カード", description:"情報や印などが記された小さな札。何かを[[示すためのもの]]。", flagId:"" },

    { id:"D140", reading:"はん", headword:"ぱん", notation:"パン", description:"小麦粉などを材料に焼いて作る食品。朝食などで[[よく食べられる]]。", flagId:"" }
  ],

  Event: [
    { eventId:"E001", conditionType:"flagCount", conditionDetail:1 },
    { eventId:"E002", conditionType:"hasFlag", conditionDetail:"F003" },
    { eventId:"E003", conditionType:"flagCount", conditionDetail:4 }
  ],

  EventScript: [
    { eventId:"E001", order:1, text:"ことばをひとつ、拾い上げた。" },
    { eventId:"E001", order:2, text:"それだけなのに、\n画面の奥が少しだけにじんで見える。" },

    { eventId:"E002", order:1, text:"同じ場所を、\n前にも見たような気がした。" },
    { eventId:"E002", order:2, text:"けれど、その続きを思い出せない。" },

    { eventId:"E003", order:1, text:"断片だったものが、\n少しずつつながり始めている。" },
    { eventId:"E003", order:2, text:"まだ、全体の形は見えない。" }
  ]
};
