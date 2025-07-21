# GraphGame

GraphGame, matematiksel ifadelerin grafiklerini çizme üzerine kurulu, çok oyunculu ve etkileşimli bir web oyunudur. Oyuncular sırayla grafik çizerek ya da tahmin ederek puan kazanmaya çalışırlar.

## Projenin Amacı

Bu proje, matematiksel görselleştirmeyi oyunlaştırarak genel kitleye ulaştırmayı amaçladı.

Orta vadede bir web tabanlı grafik motoruna entegre edilen, modüler yapıda bağımsız projelerin barındırılabileceği bir platforma dönüşmesi hedeflenmiştir.

## Özellikler

- Gerçek zamanlı çok oyunculu sistem (WebSocket tabanlı)
- Matematiksel ifadeleri parse ederek grafik üretme
- Fonksiyon ve eşitsizlik ayrımı (görsel temsiller farklı)
- Temel kullanıcı arayüzü ve oda sistemi

## Bilinen Sorunlar

- Bir oyuncu oyundan çıkınca oyun çökebilir
- Süre göstergeleri zaman zaman hatalı çalışabilir
- Yeni oyuncu katıldığında sıra takibi bozulabilir
- Bazı ifadelerin görsel çıktısı matematiksel olarak tartışmalı olabilir (`x` ifadesinin `y=x` gibi yorumlanması gibi)
- Eşitsizlikler fonksiyon değil, küme olarak işlenmektedir (örneğin `x < 0` → tüm ℝ için `y` değerleri)

## Geliştirme Olasılıkları

- Daha sağlam oyun döngüsü ve kullanıcı yönetimi
- Grafik motoru ile doğrudan bağlantı
- Minecraft API entegrasyonu (grafiği bloklarla çizmek)
- AdSense panel geometrisine göre formül görselleştirme
- Alan çizimi (integral bölgeleri) ve parametrik grafik desteği

## Canlı Demo

Mevcut sürüm çalışır durumda şu adreste görülebilir:  
🔗 [https://graphgame.onrender.com](https://graphgame.onrender.com)

Lisans yoktur, istediğiniz gibi geliştirebilir, devam edebilirsiniz.
