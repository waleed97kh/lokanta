/* The Upper Crust Türkiye, menu records transcribed from the official menu PDF (uppercrustturkiye.com/TheUpperCrust_Menu.pdf,
   price date 03.06.2026, prices include KDV). Sizes: S 23 cm (4 slices), L 37 cm (8 slices), XXL 47 cm (12 slices).
   Tags: V vegetarian, VG vegan, SPICY, STAR (house favourite mark on the menu). desc = Turkish (menu), desc_en = English. */
const menuData = [
    // PIZZAS
    { id: 'p0',  num: '',    name: "Pizza Margherita",            cat: "PIZZAS", desc: "Domates soslu, mozzarella peynirli pizza.", desc_en: "Tomato sauce and mozzarella.", img: "images/margherita.jpg", sizes: { S: 410, L: 970, XXL: 1475 }, tags: ["V"] },
    { id: 'p1',  num: '#1',  name: "The 3 Cheese",                cat: "PIZZAS", desc: "Taze sarımsak, mozzarella, ricotta, küp domates ve parmesanlı beyaz pizza.", desc_en: "White pizza with fresh garlic, mozzarella, ricotta, diced tomato and parmesan.", img: "images/menu/px-5903229.jpg", sizes: { S: 520, L: 1095, XXL: 1625 }, tags: ["V"] },
    { id: 'p2',  num: '#2',  name: "Pedro's Steak & Gorgonzola",  cat: "PIZZAS", desc: "Marine edilmiş et ve gorgonzola peynirli pizza.", desc_en: "Marinated steak and gorgonzola cheese.", img: "images/menu/px-30504704.jpg", sizes: { S: 595, L: 1345, XXL: 2185 }, tags: [] },
    { id: 'p4',  num: '#4',  name: "White Spinach",               cat: "PIZZAS", desc: "Taze ıspanak, mozzarella, beyaz peynir ve taze sarımsaklı beyaz pizza.", desc_en: "White pizza with fresh spinach, mozzarella, white cheese and fresh garlic.", img: "images/official/IMG_5705.jpg", sizes: { S: 410, L: 1045, XXL: 1570 }, tags: ["V"] },
    { id: 'p5',  num: '#5',  name: "Hawaiian",                    cat: "PIZZAS", desc: "Dana bacon ve küp ananaslı tropikal pizza. (Jalapeno eklenebilir.)", desc_en: "Beef bacon and diced pineapple. Jalapeño can be added.", img: "images/hawaiian.jpg", sizes: { S: 600, L: 1570, XXL: 2185 }, tags: [] },
    { id: 'p6',  num: '#6',  name: "Chicken Fajita Pizza",        cat: "PIZZAS", desc: "Fajita soslu jülyen tavuk, renkli biber, közlenmiş kırmızı biber.", desc_en: "Julienne chicken with fajita sauce, colourful peppers and roasted red pepper.", img: "images/menu/px-31587565.jpg", sizes: { S: 495, L: 1045, XXL: 1795 }, tags: [] },
    { id: 'p7',  num: '#7',  name: "Garden Veggie",               cat: "PIZZAS", desc: "Taze mantar, soğan, dilim tatlı biber, brokoli ve taze sarımsaklı pizza.", desc_en: "Fresh mushrooms, onion, sliced sweet peppers, broccoli and fresh garlic.", img: "images/menu/px-33593000.jpg", sizes: { S: 495, L: 925, XXL: 1260 }, tags: ["V"] },
    { id: 'p9',  num: '#9',  name: "Cheddar & Bresaola",          cat: "PIZZAS", desc: "Cheddar, bresaola, mantar, mozzarella ve sarımsaklı beyaz pizza. Roka ile servis edilir.", desc_en: "White pizza with cheddar, bresaola, mushrooms, mozzarella and garlic. Served with arugula.", img: "images/menu/px-4748485.jpg", sizes: { S: 990, L: 1910, XXL: 2325 }, tags: ["STAR"] },
    { id: 'p10', num: '#10', name: "The Kavurma",                 cat: "PIZZAS", desc: "Kavurma, mozzarella, sivri biber, kırmızı soğan ve dilim domatesli pizza.", desc_en: "Kavurma (braised beef), mozzarella, green pepper, red onion and sliced tomato.", img: "images/menu/px-19786227.jpg", sizes: { S: 780, L: 1565, XXL: 2005 }, tags: [] },
    { id: 'p11', num: '#11', name: "The Harvard Street",          cat: "PIZZAS", desc: "Taze sarımsak, mozzarella peyniri, dilim domates, taze mozzarella ve taze fesleğenli pizza.", desc_en: "Fresh garlic, mozzarella, sliced tomato, fresh mozzarella and fresh basil.", img: "images/menu/px-10779657.jpg", sizes: { S: 565, L: 1175, XXL: 1570 }, tags: ["V", "STAR"] },
    { id: 'p12', num: '#12', name: "Brendan's Buffalo Chicken",   cat: "PIZZAS", desc: "Buffalo soslu tavuk, rokfor ve mozzarella peynirli beyaz pizza.", desc_en: "White pizza with buffalo chicken, Roquefort and mozzarella.", img: "images/menu/px-35123984.jpg", sizes: { S: 565, L: 1175, XXL: 1570 }, tags: [] },
    { id: 'p13', num: '#13', name: "Bub's BBQ Chicken",           cat: "PIZZAS", desc: "Barbekü soslu tavuk, dilim soğan ve mozzarella peynirli beyaz pizza. (Dilerseniz acılı!)", desc_en: "White pizza with BBQ chicken, sliced onion and mozzarella. Can be spicy.", img: "images/BBQChicken.jpg", sizes: { S: 565, L: 1175, XXL: 1570 }, tags: ["STAR"] },
    { id: 'p14', num: '#14', name: "The State House",             cat: "PIZZAS", desc: "Etseverlere özel; pepperoni, Türk sosisi ve kıymalı pizza.", desc_en: "For meat lovers: pepperoni, Turkish sausage and minced beef.", img: "images/menu/px-5903231.jpg", sizes: { S: 615, L: 1315, XXL: 1715 }, tags: [] },
    { id: 'p15', num: '#15', name: "The \"Chief\"",               cat: "PIZZAS", desc: "Pepperoni ve mantarlı klasik pizza.", desc_en: "Classic pizza with pepperoni and mushrooms.", img: "images/pepperoni.jpg", sizes: { S: 560, L: 1215, XXL: 1555 }, tags: [] },
    { id: 'p18', num: '#18', name: "The Orhan's Fig Pizza",       cat: "PIZZAS", desc: "Tabanı beşamel soslu, incir, dana bacon, taze mozzarella, balzamik ve rokalı beyaz pizza.", desc_en: "White pizza on a béchamel base with fig, beef bacon, fresh mozzarella, balsamic and arugula.", img: "images/menu/px-24778235.jpg", sizes: { S: 915, L: 1765, XXL: 2145 }, tags: ["STAR"] },
    { id: 'p19', num: '#19', name: "White Shrimp",                cat: "PIZZAS", desc: "Taze sarımsak, mozzarella, soğan ve karidesli beyaz pizza.", desc_en: "White pizza with fresh garlic, mozzarella, onion and shrimp.", img: "images/white-shrimp.jpg", sizes: { S: 520, L: 1095, XXL: 1395 }, tags: [] },
    { id: 'p20', num: '#20', name: "Bir Ton Aşk",                 cat: "PIZZAS", desc: "Domates sosu, mozzarella peyniri, ton balığı, soğan ve sivri biberli pizza.", desc_en: "Tomato sauce, mozzarella, tuna, onion and green pepper.", img: "images/menu/px-29609011.jpg", sizes: { S: 520, L: 1095, XXL: 1395 }, tags: [] },
    { id: 'p21', num: '#21', name: "İstanbul Pizza",              cat: "PIZZAS", desc: "Sucuk, sosis, mantar ve sivri biberli pizza.", desc_en: "Turkish sucuk, sausage, mushrooms and green pepper.", img: "images/menu/px-19786200.jpg", sizes: { S: 665, L: 1385, XXL: 1810 }, tags: [] },
    { id: 'p22', num: '#22', name: "Çırağan Pizza",               cat: "PIZZAS", desc: "Sucuk, mantar, siyah zeytin ve mısırlı pizza.", desc_en: "Turkish sucuk, mushrooms, black olives and corn.", img: "images/chiragan.jpg", sizes: { S: 665, L: 1385, XXL: 1810 }, tags: [] },
    { id: 'p23', num: '#23', name: "Bebek Pizza",                 cat: "PIZZAS", desc: "Taze sarımsak, mozzarella, soğan, dana bacon, dilim patates, biberiye ve maydanozlu beyaz pizza.", desc_en: "White pizza with fresh garlic, mozzarella, onion, beef bacon, sliced potato, rosemary and parsley.", img: "images/menu/px-13599446.jpg", sizes: { S: 780, L: 1525, XXL: 1980 }, tags: [] },
    { id: 'p24', num: '#24', name: "Medi Pesto",                  cat: "PIZZAS", desc: "Tabanı pesto sosla kaplanmış, beyaz peynir, doğranmış domates ve taze sarımsaklı beyaz pizza. (Siyah zeytin eklenebilir.)", desc_en: "White pizza on a pesto base with white cheese, diced tomato and fresh garlic. Black olives can be added.", img: "images/menu/px-26575528.jpg", sizes: { S: 520, L: 1095, XXL: 1395 }, tags: ["V"] },
    { id: 'p25', num: '#25', name: "Pollogo Pesto",               cat: "PIZZAS", desc: "Tabanı pesto sosla kaplı, taze sarımsak, ızgara tavuk, gorgonzola ve parmesan peynirli pizza.", desc_en: "Pesto base, fresh garlic, grilled chicken, gorgonzola and parmesan.", img: "images/menu/px-33592992.jpg", sizes: { S: 595, L: 1255, XXL: 1615 }, tags: [] },
    { id: 'p26', num: '#26', name: "Garden Pesto",                cat: "PIZZAS", desc: "Tabanı pesto sosla kaplanmış, enginar kalbi, doğranmış domates, parmesan ve taze sarımsaklı pizza.", desc_en: "Pesto base, artichoke hearts, diced tomato, parmesan and fresh garlic.", img: "images/menu/px-6761057.jpg", sizes: { S: 715, L: 1445, XXL: 2085 }, tags: ["V", "STAR"] },
    { id: 'p27', num: '#27', name: "Rıfat'ın Acılı Pizzası",      cat: "PIZZAS", desc: "Domates sosu, pul biber, kekik, acı zeytinyağı, sucuk, dilim parmesan ve taze fesleğenli pizza. (Mozzarella peyniri bulunmamaktadır.)", desc_en: "Tomato sauce, chilli flakes, oregano, spicy olive oil, Turkish sucuk, sliced parmesan and fresh basil. No mozzarella.", img: "images/official/rifatinacilisi.jpg", sizes: { S: 780, L: 1795, XXL: 2185 }, tags: ["SPICY", "STAR"] },
    { id: 'p28', num: '#28', name: "Melek Pizza",                 cat: "PIZZAS", desc: "Tabanı köz patlıcan ve mantar sos ile kaplanmış, kıyma, kuşbaşı et, dilim domates ve beyaz cheddar peynirli pizza.", desc_en: "Roasted eggplant and mushroom sauce base, minced beef, diced beef, sliced tomato and white cheddar.", img: "images/menu/px-33592998.jpg", sizes: { S: 580, L: 1210, XXL: 1580 }, tags: [] },
    { id: 'p30', num: '#30', name: "Tıka Basa Pastırma",          cat: "PIZZAS", desc: "Domates sosu, mozzarella, pastırma, mantar ve dilim tatlı biber.", desc_en: "Tomato sauce, mozzarella, pastırma (cured beef), mushrooms and sliced sweet pepper.", img: "images/menu/px-33457550.jpg", sizes: { S: 760, L: 1470, XXL: 1905 }, tags: [] },
    { id: 'p31', num: '#31', name: "Bonfile Pizza",               cat: "PIZZAS", desc: "Domates sosu, taze sarımsak, mozzarella, soğan, bonfile ve kekikli pizza.", desc_en: "Tomato sauce, fresh garlic, mozzarella, onion, tenderloin and oregano.", img: "images/menu/px-30120985.jpg", sizes: { S: 760, L: 1470, XXL: 1905 }, tags: [] },
    { id: 'p34', num: '#34', name: "Karnıyarık Pizza",            cat: "PIZZAS", desc: "Taze sarımsak, mozzarella, soğan, küp domates, kıyma, közlenmiş patlıcan ve jalapenolu beyaz pizza.", desc_en: "White pizza with fresh garlic, mozzarella, onion, diced tomato, minced beef, roasted eggplant and jalapeño.", img: "images/menu/px-34425644.jpg", sizes: { S: 580, L: 1210, XXL: 1580 }, tags: ["SPICY"] },
    { id: 'p38', num: '#38', name: "Bi Nevi Vegan",               cat: "PIZZAS", desc: "Fermente kaju peyniri, taze ıspanak, taze sarımsak, siyah zeytin, mantarlı ve trüf yağlı vegan pizza.", desc_en: "Vegan pizza with fermented cashew cheese, fresh spinach, fresh garlic, black olives, mushrooms and truffle oil.", img: "images/menu/px-12035802.jpg", sizes: { S: 990, L: 1910, XXL: 2325 }, tags: ["VG", "STAR"] },
    { id: 'p41', num: '#41', name: "CheeseBurger Pizza",          cat: "PIZZAS", desc: "Tabanı orta acılı dijon hardal kaplanmış, rende mozzarella, kıyma, soğan, küp domates ve cheddar peynirli beyaz pizza.", desc_en: "White pizza on a medium-hot Dijon mustard base with shredded mozzarella, minced beef, onion, diced tomato and cheddar.", img: "images/menu/px-10266269.jpg", sizes: { S: 615, L: 1280, XXL: 1670 }, tags: [] },
    { id: 'p42', num: '#42', name: "The Upper Lahmacun",          cat: "PIZZAS", desc: "Bizim Crust'ımızla, bol yeşillikli çıtır çıtır dev bir lahmacun hayal eden tek biz değiliz herhalde?", desc_en: "A giant, crisp lahmacun on our own crust, served with lots of greens.", img: "images/menu/px-32562202.jpg", sizes: { ONE_SIZE: 795 }, tags: [] },
    { id: 'p43', num: '#43', name: "Pasifik Rüzgarı",             cat: "PIZZAS", desc: "Domates sosu, taze sarımsak, mozzarella, istiridye mantarı, dana jambon, çeri domates, kuru kekik ve taze fesleğenli pizza.", desc_en: "Tomato sauce, fresh garlic, mozzarella, oyster mushrooms, beef ham, cherry tomatoes, dried oregano and fresh basil.", img: "images/menu/px-19252765.jpg", sizes: { S: 640, L: 1335, XXL: 1740 }, tags: ["STAR"] },
    { id: 'p50', num: '#50', name: "Çikolata Pizza",              cat: "PIZZAS", desc: "Tabanı çikolata kaplı orman ve mevsim meyveli pizza.", desc_en: "Chocolate base with forest and seasonal fruits.", img: "images/menu/px-31094828.jpg", sizes: { S: 560, L: 1185, XXL: 1515 }, tags: ["STAR"] },

    // SLICES
    { id: 'sl1', num: '', name: "Peynirli Dilim",     cat: "SLICES", desc: "Bir dilim klasik peynirli pizza.", desc_en: "One slice of classic cheese pizza.", img: "images/menu/px-35181407.jpg", sizes: { ONE_SIZE: 215 }, tags: ["V"] },
    { id: 'sl2', num: '', name: "Pepperonili Dilim",  cat: "SLICES", desc: "Bir dilim pepperonili pizza.", desc_en: "One slice of pepperoni pizza.", img: "images/menu/px-34769483.jpg", sizes: { ONE_SIZE: 215 }, tags: [] },
    { id: 'sl3', num: '', name: "Günün Dilimi",       cat: "SLICES", desc: "Her gün değişen bir pizzadan bir dilim. Dilim pizza ve diğer günlük menülerimizi şubelerimizde sorunuz.", desc_en: "One slice of a pizza that changes every day. Ask in the branches for slice combos and daily menus.", img: "images/menu/px-31587831.jpg", sizes: { ONE_SIZE: 290 }, tags: [] },

    // STARTERS
    { id: 's1', num: '', name: "Ispanak Küpleri",                  cat: "STARTERS", desc: "Ispanak, cheddar peyniri ve sütten oluşan lezzet küpleri.", desc_en: "Spinach, cheddar and milk baked into little cubes.", img: "images/menu/px-5665638.jpg", sizes: { ONE_SIZE: 375 }, tags: ["V"] },
    { id: 's2', num: '', name: "Sarımsaklı Ekmek",                 cat: "STARTERS", desc: "Sarımsaklı sosla fırınlanmış mozzarellalı ekmek dilimleri.", desc_en: "Bread slices baked with garlic sauce and mozzarella.", img: "images/sarmisakli.jpg", sizes: { ONE_SIZE: 310 }, tags: ["V"] },
    { id: 's3', num: '', name: "Lazanya",                          cat: "STARTERS", desc: "Fırında bolonez ve beşamel soslu lazanya.", desc_en: "Oven-baked lasagna with bolognese and béchamel.", img: "images/menu/px-31779545.jpg", sizes: { ONE_SIZE: 550 }, tags: [] },
    { id: 's4', num: '', name: "Parmak Patates",                   cat: "STARTERS", desc: "Özel karışım baharatlı fırında parmak patates.", desc_en: "Oven-baked fries with our spice mix.", img: "images/fries.jpg", sizes: { ONE_SIZE: 295 }, tags: ["V", "VG"] },
    { id: 's6', num: '', name: "Cheddar ve Trüflü Parmak Patates", cat: "STARTERS", desc: "Cheddar peyniri ve trüflü özel karışım baharatlı fırında parmak patates.", desc_en: "Oven-baked fries with cheddar, truffle and our spice mix.", img: "images/menu/px-31806278.jpg", sizes: { ONE_SIZE: 355 }, tags: ["V"] },
    { id: 's5', num: '', name: "Güveçte Acılı Tavuk Topları",      cat: "STARTERS", desc: "Özel karışım baharatlı fırında tavuk topları.", desc_en: "Spicy chicken balls baked in a casserole with our spice mix.", img: "images/menu/px-29872932.jpg", sizes: { ONE_SIZE: 465 }, tags: ["SPICY"] },

    // SALADS
    { id: 'sa1', num: '', name: "Fit Salata",             cat: "SALADS", desc: "Karışık yeşillik, renkli biberler, kuru kayısı, kuru erik, beyaz peynir, ceviz.", desc_en: "Mixed greens, colourful peppers, dried apricot, prune, white cheese, walnuts.", img: "images/menu/px-31269817.jpg", sizes: { ONE_SIZE: 410 }, tags: ["V"] },
    { id: 'sa2', num: '', name: "Izgara Sebze Salatası",  cat: "SALADS", desc: "Akdeniz yeşillikleri, ızgara patlıcan, ızgara kabak, kinoa, kurutulmuş domates, keçi peyniri.", desc_en: "Mediterranean greens, grilled eggplant, grilled zucchini, quinoa, sun-dried tomato, goat cheese.", img: "images/menu/px-34227777.jpg", sizes: { ONE_SIZE: 490 }, tags: ["V"] },
    { id: 'sa4', num: '', name: "Roka Salatası",          cat: "SALADS", desc: "Roka, parmesan, cherry domates, enginar kalbi, kurutulmuş domates, ceviz, limon.", desc_en: "Arugula, parmesan, cherry tomatoes, artichoke hearts, sun-dried tomato, walnuts, lemon.", img: "images/menu/px-28446388.jpg", sizes: { ONE_SIZE: 410 }, tags: ["V"] },
    { id: 'sa5', num: '', name: "Sezar Salata",           cat: "SALADS", desc: "Göbek, parmesan, kruton, ızgara tavuk, limon.", desc_en: "Iceberg, parmesan, croutons, grilled chicken, lemon.", img: "images/salad-caesar.jpg", sizes: { ONE_SIZE: 410 }, tags: [] },
    { id: 'sa6', num: '', name: "Ton Balıklı Salata",     cat: "SALADS", desc: "Akdeniz yeşilliği, göbek, ton balığı, mısır, cherry domates, maydanoz, limon.", desc_en: "Mediterranean greens, iceberg, tuna, corn, cherry tomatoes, parsley, lemon.", img: "images/menu/px-19051901.jpg", sizes: { ONE_SIZE: 490 }, tags: [] },
    { id: 'sa3', num: '', name: "Akdeniz Salata",         cat: "SALADS", desc: "Göbek, akdeniz yeşillikleri, havuç, salatalık, domates, maydanoz, beyaz peynir, dilim zeytin, limon.", desc_en: "Iceberg, Mediterranean greens, carrot, cucumber, tomato, parsley, white cheese, sliced olives, lemon.", img: "images/salad-mediterranean.jpg", sizes: { ONE_SIZE: 410 }, tags: ["V"] },

    // DESSERTS
    { id: 'd1', num: '', name: "Bask Cheesecake",    cat: "DESSERTS", desc: "Bask usulü cheesecake.", desc_en: "Basque cheesecake.", img: "images/cheesecake.jpg", sizes: { ONE_SIZE: 420 }, tags: ["V"] },
    { id: 'd2', num: '', name: "Tiramisu",           cat: "DESSERTS", desc: "Klasik tiramisu.", desc_en: "Classic tiramisu.", img: "images/tiramisu.jpg", sizes: { ONE_SIZE: 495 }, tags: ["V"] },
    { id: 'd3', num: '', name: "Chocolate Calzone",  cat: "DESSERTS", desc: "Çikolatalı calzone.", desc_en: "Chocolate calzone.", img: "images/menu/px-36642831.jpg", sizes: { ONE_SIZE: 290 }, tags: ["V"] },

    // DRINKS, cold
    { id: 'dr8',  num: '', name: "Coca-Cola",        cat: "DRINKS", sub: "COLD", size_label: "33 cl", desc: "", desc_en: "", img: "images/menu/px-33469209.jpg", sizes: { ONE_SIZE: 115 }, tags: [] },
    { id: 'dr9',  num: '', name: "Coca-Cola Zero",   cat: "DRINKS", sub: "COLD", size_label: "33 cl", desc: "", desc_en: "", img: "images/menu/px-8879617.jpg", sizes: { ONE_SIZE: 115 }, tags: [] },
    { id: 'dr19', num: '', name: "Coca-Cola Light",  cat: "DRINKS", sub: "COLD", size_label: "33 cl", desc: "", desc_en: "", img: "images/menu/px-8879626.jpg", sizes: { ONE_SIZE: 115 }, tags: [] },
    { id: 'dr10', num: '', name: "Fanta",            cat: "DRINKS", sub: "COLD", size_label: "33 cl", desc: "", desc_en: "", img: "images/menu/px-36951470.jpg", sizes: { ONE_SIZE: 115 }, tags: [] },
    { id: 'dr11', num: '', name: "Sprite",           cat: "DRINKS", sub: "COLD", size_label: "33 cl", desc: "", desc_en: "", img: "images/menu/px-9996446.jpg", sizes: { ONE_SIZE: 115 }, tags: [] },
    { id: 'dr12', num: '', name: "Schweppes",        cat: "DRINKS", sub: "COLD", size_label: "33 cl", desc: "", desc_en: "", img: "images/menu/px-33642286.jpg", sizes: { ONE_SIZE: 120 }, tags: [] },
    { id: 'dr13', num: '', name: "Fuse Tea",         cat: "DRINKS", sub: "COLD", size_label: "33 cl", desc: "", desc_en: "", img: "images/menu/px-792613.jpg", sizes: { ONE_SIZE: 115 }, tags: [] },
    { id: 'dr14', num: '', name: "Limonata",         cat: "DRINKS", sub: "COLD", size_label: "33 cl", desc: "Normal veya çilekli.", desc_en: "Lemonade, plain or strawberry.", img: "images/menu/px-30591640.jpg", sizes: { ONE_SIZE: 165 }, tags: [] },
    { id: 'dr15', num: '', name: "Uludağ Premium",   cat: "DRINKS", sub: "COLD", size_label: "75 cl", desc: "", desc_en: "", img: "images/menu/px-13723906.jpg", sizes: { ONE_SIZE: 220 }, tags: [] },
    { id: 'dr20', num: '', name: "Uludağ Premium",   cat: "DRINKS", sub: "COLD", size_label: "25 cl", desc: "", desc_en: "", img: "images/menu/px-12987479.jpg", sizes: { ONE_SIZE: 125 }, tags: [] },
    { id: 'dr16', num: '', name: "Maden Suyu",       cat: "DRINKS", sub: "COLD", size_label: "25 cl", desc: "", desc_en: "Mineral water.", img: "images/menu/px-8679539.jpg", sizes: { ONE_SIZE: 75 }, tags: [] },
    { id: 'dr17', num: '', name: "Ayran",            cat: "DRINKS", sub: "COLD", size_label: "33 cl", desc: "", desc_en: "", img: "images/menu/px-18142603.jpg", sizes: { ONE_SIZE: 90 }, tags: [] },
    { id: 'dr18', num: '', name: "Su",               cat: "DRINKS", sub: "COLD", size_label: "33 cl", desc: "", desc_en: "Water.", img: "images/menu/px-7904434.jpg", sizes: { ONE_SIZE: 75 }, tags: [] },
    { id: 'dr21', num: '', name: "Su",               cat: "DRINKS", sub: "COLD", size_label: "1 L", desc: "", desc_en: "Water.", img: "images/menu/px-38680786.jpg", sizes: { ONE_SIZE: 115 }, tags: [] },
    // DRINKS, hot
    { id: 'dr1', num: '', name: "Türk Kahvesi",     cat: "DRINKS", sub: "HOT", desc: "", desc_en: "Turkish coffee.", img: "images/menu/px-36535224.jpg", sizes: { ONE_SIZE: 115 }, tags: [] },
    { id: 'dr2', num: '', name: "Espresso",         cat: "DRINKS", sub: "HOT", desc: "", desc_en: "", img: "images/menu/px-11918562.jpg", sizes: { ONE_SIZE: 115 }, tags: [] },
    { id: 'dr3', num: '', name: "Double Espresso",  cat: "DRINKS", sub: "HOT", desc: "", desc_en: "", img: "images/menu/px-27589853.jpg", sizes: { ONE_SIZE: 130 }, tags: [] },
    { id: 'dr4', num: '', name: "Americano",        cat: "DRINKS", sub: "HOT", desc: "", desc_en: "", img: "images/menu/px-7855562.jpg", sizes: { ONE_SIZE: 130 }, tags: [] },
    { id: 'dr5', num: '', name: "Cappuccino",       cat: "DRINKS", sub: "HOT", desc: "", desc_en: "", img: "images/menu/px-4913342.jpg", sizes: { ONE_SIZE: 145 }, tags: [] },
    { id: 'dr6', num: '', name: "Filtre Kahve",     cat: "DRINKS", sub: "HOT", desc: "", desc_en: "Filter coffee.", img: "images/menu/px-29498509.jpg", sizes: { ONE_SIZE: 115 }, tags: [] },
    { id: 'dr7', num: '', name: "Çay",              cat: "DRINKS", sub: "HOT", desc: "", desc_en: "Tea.", img: "images/menu/px-28617425.jpg", sizes: { ONE_SIZE: 70 }, tags: [] },

    // WINES (kadeh = glass, şişe = bottle)
    { id: 'w1',  num: '', name: "Hayal",   cat: "WINES", sub: "RED",   desc: "Cabernet Sauvignon & Shiraz", desc_en: "Cabernet Sauvignon & Shiraz", img: "images/menu/px-14465764.jpg", sizes: { GLASS: 340, BOTTLE: 1350 }, tags: [] },
    { id: 'w2',  num: '', name: "DLC",     cat: "WINES", sub: "RED",   desc: "Kalecik Karası", desc_en: "Kalecik Karası", img: "images/menu/px-8084637.jpg", sizes: { GLASS: 460, BOTTLE: 1850 }, tags: [] },
    { id: 'w3',  num: '', name: "DLC",     cat: "WINES", sub: "RED",   desc: "Cabernet Sauvignon & Merlot", desc_en: "Cabernet Sauvignon & Merlot", img: "images/menu/px-14465764.jpg", sizes: { GLASS: 460, BOTTLE: 1850 }, tags: [] },
    { id: 'w4',  num: '', name: "Kav",     cat: "WINES", sub: "RED",   desc: "Boğazkere & Öküzgözü", desc_en: "Boğazkere & Öküzgözü", img: "images/menu/px-8084637.jpg", sizes: { GLASS: 460, BOTTLE: 1850 }, tags: [] },
    { id: 'w5',  num: '', name: "Sarafin", cat: "WINES", sub: "RED",   desc: "Cabernet Sauvignon", desc_en: "Cabernet Sauvignon", img: "images/menu/px-14465764.jpg", sizes: { BOTTLE: 3950 }, tags: [] },
    { id: 'w6',  num: '', name: "Hayal",   cat: "WINES", sub: "WHITE", desc: "Sultaniye & Sauvignon Blanc", desc_en: "Sultaniye & Sauvignon Blanc", img: "images/menu/px-28454104.jpg", sizes: { GLASS: 340, BOTTLE: 1350 }, tags: [] },
    { id: 'w7',  num: '', name: "DLC",     cat: "WINES", sub: "WHITE", desc: "Sauvignon Blanc", desc_en: "Sauvignon Blanc", img: "images/menu/px-10403547.jpg", sizes: { GLASS: 460, BOTTLE: 1850 }, tags: [] },
    { id: 'w8',  num: '', name: "Kav",     cat: "WINES", sub: "WHITE", desc: "Narince", desc_en: "Narince", img: "images/menu/px-28454104.jpg", sizes: { GLASS: 460, BOTTLE: 1850 }, tags: [] },
    { id: 'w9',  num: '', name: "Sarafin", cat: "WINES", sub: "WHITE", desc: "Chardonnay", desc_en: "Chardonnay", img: "images/menu/px-10403547.jpg", sizes: { BOTTLE: 3950 }, tags: [] },
    { id: 'w10', num: '', name: "Hayal",   cat: "WINES", sub: "ROSE",  desc: "Blush", desc_en: "Blush", img: "images/menu/px-4946408.jpg", sizes: { GLASS: 340, BOTTLE: 1350 }, tags: [] },
    { id: 'w11', num: '', name: "Verano",  cat: "WINES", sub: "ROSE",  desc: "Blush", desc_en: "Blush", img: "images/menu/px-4946408.jpg", sizes: { GLASS: 440, BOTTLE: 1700 }, tags: [] },

    // BEERS
    { id: 'b1',  num: '', name: "Efes Pilsen",        cat: "BEERS", size_label: "33 cl",   desc: "", desc_en: "", img: "images/menu/px-27623973.jpg", sizes: { ONE_SIZE: 230 }, tags: [] },
    { id: 'b2',  num: '', name: "Efes Pilsen",        cat: "BEERS", size_label: "50 cl",   desc: "", desc_en: "", img: "images/menu/px-20769832.jpg", sizes: { ONE_SIZE: 310 }, tags: [] },
    { id: 'b3',  num: '', name: "Efes Özel Seri",     cat: "BEERS", size_label: "50 cl",   desc: "", desc_en: "", img: "images/menu/px-15991209.jpg", sizes: { ONE_SIZE: 335 }, tags: [] },
    { id: 'b4',  num: '', name: "Efes Glutensiz",     cat: "BEERS", size_label: "50 cl",   desc: "Glutensiz.", desc_en: "Gluten-free.", img: "images/menu/px-8508488.jpg", sizes: { ONE_SIZE: 400 }, tags: [] },
    { id: 'b5',  num: '', name: "Efes Malt",          cat: "BEERS", size_label: "50 cl",   desc: "", desc_en: "", img: "images/menu/px-20769832.jpg", sizes: { ONE_SIZE: 310 }, tags: [] },
    { id: 'b6',  num: '', name: "Beck's",             cat: "BEERS", size_label: "33 cl",   desc: "", desc_en: "", img: "images/menu/px-28902910.jpg", sizes: { ONE_SIZE: 295 }, tags: [] },
    { id: 'b7',  num: '', name: "Bomonti Filtresiz",  cat: "BEERS", size_label: "50 cl",   desc: "", desc_en: "Unfiltered.", img: "images/menu/px-27623973.jpg", sizes: { ONE_SIZE: 360 }, tags: [] },
    { id: 'b8',  num: '', name: "Belfast",            cat: "BEERS", size_label: "50 cl",   desc: "", desc_en: "", img: "images/menu/px-15991209.jpg", sizes: { ONE_SIZE: 340 }, tags: [] },
    { id: 'b9',  num: '', name: "Bud",                cat: "BEERS", size_label: "50 cl",   desc: "", desc_en: "", img: "images/menu/px-28902910.jpg", sizes: { ONE_SIZE: 375 }, tags: [] },
    { id: 'b10', num: '', name: "Corona",             cat: "BEERS", size_label: "35,5 cl", desc: "", desc_en: "", img: "images/menu/px-30211152.jpg", sizes: { ONE_SIZE: 480 }, tags: [] },
    { id: 'b11', num: '', name: "Erdinger",           cat: "BEERS", size_label: "33 cl",   desc: "", desc_en: "", img: "images/menu/px-8508488.jpg", sizes: { ONE_SIZE: 500 }, tags: [] },
    { id: 'b12', num: '', name: "Heineken",           cat: "BEERS", size_label: "33 cl",   desc: "", desc_en: "", img: "images/menu/px-30211152.jpg", sizes: { ONE_SIZE: 480 }, tags: [] }
];

/* Photos in images/menu/px-*.jpg are Pexels stock chosen to resemble each dish (Pexels license); see images/menu/SOURCES.md. */

/* Extra toppings for the pizza builder, priced per L / XXL pizza. Names as printed on the menu. */
const menuToppings = [
    { id: 't-izgara-tavuk', group: 'MEAT', name: 'Izgara Tavuk', name_en: 'Grilled chicken', L: 155, XXL: 195 },
    { id: 't-pane-tavuk', group: 'MEAT', name: 'Pane Tavuk', name_en: 'Breaded chicken', L: 155, XXL: 195 },
    { id: 't-bbq-tavuk', group: 'MEAT', name: 'Barbekü Soslu Tavuk', name_en: 'BBQ chicken', L: 155, XXL: 195 },
    { id: 't-buffalo-tavuk', group: 'MEAT', name: 'Buffalo Soslu Tavuk', name_en: 'Buffalo chicken', L: 155, XXL: 195 },
    { id: 't-bonfile', group: 'MEAT', name: 'Bonfile', name_en: 'Tenderloin', L: 260, XXL: 300 },
    { id: 't-bresaola', group: 'MEAT', name: 'Bresaola', name_en: 'Bresaola', L: 485, XXL: 645 },
    { id: 't-sosis', group: 'MEAT', name: 'Sosis', name_en: 'Sausage', L: 155, XXL: 195 },
    { id: 't-kusbasi', group: 'MEAT', name: 'Kuşbaşı Et', name_en: 'Diced beef', L: 220, XXL: 295 },
    { id: 't-kiyma', group: 'MEAT', name: 'Kıyma', name_en: 'Minced beef', L: 220, XXL: 295 },
    { id: 't-pastirma', group: 'MEAT', name: 'Pastırma', name_en: 'Pastırma', L: 310, XXL: 395 },
    { id: 't-cotto', group: 'MEAT', name: 'Dana Cotto', name_en: 'Beef cotto', L: 310, XXL: 395 },
    { id: 't-jambon', group: 'MEAT', name: 'Dana Jambon', name_en: 'Beef ham', L: 175, XXL: 230 },
    { id: 't-pepperoni', group: 'MEAT', name: 'Dana Pepperoni', name_en: 'Beef pepperoni', L: 180, XXL: 250 },
    { id: 't-bacon', group: 'MEAT', name: 'Dana Bacon', name_en: 'Beef bacon', L: 310, XXL: 395 },
    { id: 't-sucuk', group: 'MEAT', name: 'Sucuk', name_en: 'Sucuk', L: 175, XXL: 230 },
    { id: 't-kavurma', group: 'MEAT', name: 'Kavurma', name_en: 'Kavurma', L: 260, XXL: 300 },
    { id: 't-karides', group: 'SEA', name: 'Karides', name_en: 'Shrimp', L: 220, XXL: 295 },
    { id: 't-ton', group: 'SEA', name: 'Ton Balığı', name_en: 'Tuna', L: 220, XXL: 295 },
    { id: 't-taze-mozzarella', group: 'CHEESE', name: 'Taze Mozzarella', name_en: 'Fresh mozzarella', L: 165, XXL: 220 },
    { id: 't-parmesan', group: 'CHEESE', name: 'Parmesan', name_en: 'Parmesan', L: 195, XXL: 285 },
    { id: 't-ricotta', group: 'CHEESE', name: 'Ricotta', name_en: 'Ricotta', L: 175, XXL: 230 },
    { id: 't-kaju', group: 'CHEESE', name: 'Fermente Kaju Peyniri', name_en: 'Fermented cashew cheese', L: 220, XXL: 295 },
    { id: 't-beyaz-peynir', group: 'CHEESE', name: 'Beyaz Peynir', name_en: 'White cheese', L: 155, XXL: 195 },
    { id: 't-gorgonzola', group: 'CHEESE', name: 'Gorgonzola', name_en: 'Gorgonzola', L: 155, XXL: 195 },
    { id: 't-keci', group: 'CHEESE', name: 'Keçi Peyniri', name_en: 'Goat cheese', L: 155, XXL: 195 },
    { id: 't-beyaz-cheddar', group: 'CHEESE', name: 'Beyaz Cheddar', name_en: 'White cheddar', L: 175, XXL: 230 },
    { id: 't-sari-cheddar', group: 'CHEESE', name: 'Sarı Cheddar', name_en: 'Yellow cheddar', L: 195, XXL: 285 },
    { id: 't-mantar', group: 'VEG', name: 'Mantar', name_en: 'Mushroom', L: 85, XXL: 130 },
    { id: 't-feslegen', group: 'VEG', name: 'Taze Fesleğen', name_en: 'Fresh basil', L: 120, XXL: 160 },
    { id: 't-sarimsak', group: 'VEG', name: 'Taze Sarımsak', name_en: 'Fresh garlic', L: 85, XXL: 130 },
    { id: 't-kup-domates', group: 'VEG', name: 'Küp Domates', name_en: 'Diced tomato', L: 85, XXL: 130 },
    { id: 't-dilim-domates', group: 'VEG', name: 'Dilim Domates', name_en: 'Sliced tomato', L: 85, XXL: 130 },
    { id: 't-sogan', group: 'VEG', name: 'Soğan', name_en: 'Onion', L: 85, XXL: 130 },
    { id: 't-koz-biber', group: 'VEG', name: 'Közlenmiş Kırmızı Biber', name_en: 'Roasted red pepper', L: 120, XXL: 160 },
    { id: 't-kuru-domates', group: 'VEG', name: 'Kurutulmuş Domates', name_en: 'Sun-dried tomato', L: 85, XXL: 130 },
    { id: 't-koz-patlican', group: 'VEG', name: 'Közlenmiş Patlıcan', name_en: 'Roasted eggplant', L: 120, XXL: 160 },
    { id: 't-ceri', group: 'VEG', name: 'Çeri Domates', name_en: 'Cherry tomato', L: 85, XXL: 130 },
    { id: 't-patates', group: 'VEG', name: 'Dilim Patates', name_en: 'Sliced potato', L: 85, XXL: 130 },
    { id: 't-roka', group: 'VEG', name: 'Roka', name_en: 'Arugula', L: 85, XXL: 130 },
    { id: 't-brokoli', group: 'VEG', name: 'Brokoli', name_en: 'Broccoli', L: 85, XXL: 130 },
    { id: 't-izgara-patlican', group: 'VEG', name: 'Izgara Patlıcan', name_en: 'Grilled eggplant', L: 125, XXL: 165 },
    { id: 't-izgara-kabak', group: 'VEG', name: 'Izgara Kabak', name_en: 'Grilled zucchini', L: 125, XXL: 165 },
    { id: 't-ispanak', group: 'VEG', name: 'Ispanak', name_en: 'Spinach', L: 85, XXL: 130 },
    { id: 't-dilim-biber', group: 'VEG', name: 'Dilim Biber', name_en: 'Sliced peppers', L: 120, XXL: 160 },
    { id: 't-sivri-biber', group: 'VEG', name: 'Sivri Biber', name_en: 'Green pepper', L: 85, XXL: 130 },
    { id: 't-jalapeno', group: 'VEG', name: 'Jalapeno Biber', name_en: 'Jalapeño', L: 130, XXL: 205 },
    { id: 't-maydanoz', group: 'VEG', name: 'Maydanoz', name_en: 'Parsley', L: 85, XXL: 130 },
    { id: 't-ananas', group: 'VEG', name: 'Ananas', name_en: 'Pineapple', L: 85, XXL: 130 },
    { id: 't-enginar', group: 'VEG', name: 'Enginar Kalbi', name_en: 'Artichoke hearts', L: 130, XXL: 205 },
    { id: 't-zeytin', group: 'VEG', name: 'Siyah Zeytin', name_en: 'Black olives', L: 85, XXL: 130 },
    { id: 't-misir', group: 'VEG', name: 'Mısır', name_en: 'Corn', L: 125, XXL: 165 },
    { id: 't-pesto', group: 'SAUCE', name: 'Pesto Sos', name_en: 'Pesto sauce', L: 130, XXL: 205 },
    { id: 't-atom', group: 'SAUCE', name: 'Atom Acı Sos', name_en: 'Atom hot sauce', L: 85, XXL: 130 },
    { id: 't-truffle', group: 'SAUCE', name: 'Truffle Sos', name_en: 'Truffle sauce', L: 85, XXL: 130 }
];

/* House rules printed on the menu. */
const menuRules = {
    sizes: { S: { cm: 23, slices: 4 }, L: { cm: 37, slices: 8 }, XXL: { cm: 47, slices: 12 } },
    halfHalfSurcharge: { L: 40, XXL: 80 },      // "Yarı yarıya pizzalara fark eklenir"
    glutenFreeSurcharge: { L: 165, XXL: 220 },  // "Tüm Large ve XXL pizzalarımızı glutensiz tercih edebilirsiniz"
    wholeWheat: true,                           // Kepekli hamur available
    priceDate: '03.06.2026'
};

window.menuData = menuData;
window.menuToppings = menuToppings;
window.menuRules = menuRules;
