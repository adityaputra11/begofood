# Begofood research catalog

Dataset awal berisi **36 hidangan nyata** yang lazim ditemukan pada layanan pesan-antar makanan di Indonesia. Dataset dibagi merata menjadi tiga klaster sesuai batasan penelitian:

| Klaster            | Jumlah | Restoran yang direpresentasikan                                                          |
| ------------------ | -----: | ---------------------------------------------------------------------------------------- |
| Western–Indonesian |     12 | Sate Khas Senayan, HOLYCOW!, Pizza Marzano Indonesia, Cinnamon Mandarin Oriental Jakarta |
| Chinese Food       |     12 | Bakmi GM, Ta Wan, Imperial Kitchen & Dimsum                                              |
| Seafood            |     12 | Bandar Djakarta dan D'Cost Seafood                                                       |

Nama restoran dan menu diverifikasi dari kanal resmi: [Sate Khas Senayan](https://satekhas.sarirasa.co.id/menu), [Steak Hotel by HOLYCOW!](https://www.holycowsteak.com/pages/menu-steak-hotel-by-holycow), [Pizza Marzano Indonesia](https://www.pizzamarzano.co.id/menu/main-menu/), [Bakmi GM](https://www.bakmigm.com/menu), [Ta Wan](https://www.tawanrestaurant.com/), [Imperial Kitchen & Dimsum](https://www.impgroup.co.id/our-brands/imperial-kitchen-dimsum), [Bandar Djakarta](https://www.bandar-djakarta.com/bandar-djakarta-menu/), [D'Cost Seafood](https://dcostseafood.id/), dan [Cinnamon Mandarin Oriental Jakarta](https://photos.mandarinoriental.com/is/content/MandarinOriental/jakarta-restaurant-cinnamon-menu). URL sumber terkait disimpan pada `sourceUrl` di setiap record.

> Catatan metodologis: nama restoran dan hidangan berasal dari katalog resmi. Harga dengan `priceStatus=official_snapshot_2026_07_11` berasal dari harga yang tampil saat sumber diakses; nilai lainnya adalah estimasi penelitian. Rating dan jumlah ulasan dinolkan karena tidak tersedia pada sumber resmi. Foto, kalori, waktu persiapan, pemetaan alergen, dan risiko kontaminasi merupakan data representatif yang masih harus divalidasi ahli/restoran. Dataset tidak menyatakan stok atau ketersediaan real-time.

## Metadata penelitian

Setiap menu menyimpan:

- komposisi utama (`ingredients`);
- bahan yang sering tidak terlihat dari nama menu (`hiddenIngredients`);
- alergen terstandardisasi (`allergens`);
- karakter sensoris (`sensoryProfile`): renyah, lembut, hangat, dan aromatik;
- risiko proses bersama (`crossContaminationRisk`);
- tag cita rasa pedas, manis, asam, dan gurih; estimasi kalori; klaster; kategori; status harga; dan sumber resmi.
- rating dan jumlah ulasan tidak digunakan dalam sistem final.

Data alergi dibatasi pada `kacang`, `susu`, `telur`, dan `seafood`. Proses normalisasi seed dan migrasi mengeluarkan nilai alergen di luar empat kategori tersebut agar dataset, penyaringan, dan naskah menggunakan ruang lingkup yang sama.

## Aturan penggunaan

1. Nama menu/restoran dan URL sumber dapat dipakai sebagai data observasi, sedangkan `allergens` tetap merupakan ground truth awal yang harus divalidasi ahli/domain reviewer sebelum eksperimen final.
2. Menu dengan irisan antara alergi user dan `allergens` tidak boleh masuk rekomendasi utama.
3. UI harus menampilkan alasan, bahan tersembunyi, dan risiko kontaminasi silang; tombol pilihan pada menu berbahaya harus nonaktif.
4. Klaim “aman” berarti tidak ada konflik pada dataset, bukan jaminan medis. Pengguna dengan alergi berat tetap perlu mengonfirmasi ke restoran.

## Rencana evaluasi Bab IV

- Buat skenario uji per alergen dengan kelas positif dan negatif yang seimbang.
- Bandingkan keluaran Medical Agent dengan ground truth yang sudah direview.
- Laporkan confusion matrix, precision, recall, F1, serta false-negative rate. Untuk konteks keselamatan, false negative harus menjadi metrik utama.
- Ambil `meta.processingMs` dari respons `GET /agent/menu` untuk distribusi latency (median/P50 dan P95), bukan hanya satu kali pengukuran.
- Uji perubahan deskripsi sensoris dan explanation secara terpisah menggunakan rubrik relevansi 1–5.
