// Butir AKPD per jenjang untuk sesi baru (cfg.ver >= 2). Tiap baris = satu putaran empat bidang:
// pribadi, sosial, belajar, karier. 15 putaran = 60 butir. Varian SMP ada di instruments.js (AKPD_RAW).
// Semua kalimat ditulis untuk Examus dan belum divalidasi. Untuk kelas rendah SD (I-III), bacakan soal dan dampingi murid.
export const AKPD_AREAS = ["pribadi", "sosial", "belajar", "karier"];
const flat = (rows) => rows.flat();

export const AKPD_SD = flat([
  ["Mengenal hal yang aku bisa dan hal yang masih perlu kulatih", "Berbicara dengan baik kepada orang lain", "Menemukan cara belajar yang cocok untukku", "Mengenal hal yang kusukai dan bisa kulakukan dengan baik"],
  ["Merasa percaya diri", "Berkenalan dan mencari teman baru", "Fokus saat belajar di kelas", "Mengenal berbagai macam pekerjaan"],
  ["Mengendalikan rasa marah dan kesal", "Menyampaikan pendapat dengan sopan", "Membuat jadwal belajar di rumah", "Memikirkan cita-citaku"],
  ["Mengatasi rasa takut atau cemas", "Berbaikan setelah bertengkar dengan teman", "Mencatat pelajaran dengan rapi", "Mengetahui pelajaran yang berguna untuk cita-citaku"],
  ["Mengatur waktu untuk belajar, bermain, dan istirahat", "Bekerja sama dalam kelompok", "Menyiapkan diri sebelum ulangan", "Mengenal SMP dan cara masuk SMP"],
  ["Menjaga badan tetap sehat, makan teratur, dan tidur cukup", "Berani menolak ajakan teman yang tidak baik", "Mengatasi rasa malas belajar", "Mencoba kegiatan baru, seperti olahraga, seni, atau lomba"],
  ["Berkata jujur dan bertanggung jawab", "Menghargai teman yang berbeda dariku", "Berani bertanya kepada guru kalau belum paham", "Mengetahui pekerjaan orang-orang di sekitarku"],
  ["Memutuskan hal-hal kecil sendiri", "Menghadapi teman yang mengejek atau mengganggu", "Mengejar pelajaran yang tertinggal", "Mencari tahu pelajaran yang paling kusukai"],
  ["Memahami perubahan pada tubuh dan perasaanku saat tumbuh besar", "Berhubungan baik dengan orang tua dan keluarga", "Mengerjakan PR dan tugas tepat waktu", "Bercerita tentang cita-citaku kepada orang tua atau guru"],
  ["Memakai HP, gim, dan internet dengan aman dan secukupnya", "Berteman dengan teman laki-laki dan perempuan dengan sopan", "Membaca dan memahami bacaan atau soal yang panjang", "Mengenal kegiatan atau ekstrakurikuler yang cocok untukku"],
  ["Mengenali dan menyebutkan perasaanku", "Meminta maaf dan memaafkan teman", "Memahami pelajaran yang terasa sulit", "Mengenal kebiasaan baik yang dibutuhkan saat bekerja, seperti rajin dan jujur"],
  ["Bangkit lagi setelah gagal atau kecewa", "Mendengarkan teman yang sedang bercerita", "Mengurangi rasa gugup saat ulangan", "Mengetahui hal yang perlu kupelajari supaya cita-citaku tercapai"],
  ["Menyayangi diri sendiri walau ada yang lebih pintar dariku", "Menjaga keselamatan dan sopan santun di internet", "Memakai internet dan kecerdasan buatan (AI) dengan jujur untuk belajar", "Bertanya kepada orang dewasa tentang pekerjaan mereka"],
  ["Memahami mana yang benar dan mana yang salah", "Menceritakan masalahku kepada orang tua atau guru", "Belajar bersama teman dengan baik", "Membayangkan diriku saat sudah besar"],
  ["Hidup bersih dan sehat setiap hari", "Peduli dan suka menolong orang lain", "Menentukan target belajar yang ingin kucapai", "Memikirkan sekolah yang ingin kumasuki sesudah SD"],
]);

export const AKPD_SMA = flat([
  ["Mengenali kelebihan dan kekuranganku", "Berkomunikasi dengan jelas dan sopan", "Menemukan cara belajar yang paling cocok untukku", "Mengenali minat dan bakatku"],
  ["Menumbuhkan rasa percaya diri", "Memulai pertemanan di lingkungan yang baru", "Berkonsentrasi saat belajar", "Mengenal berbagai pilihan profesi dan pekerjaan"],
  ["Mengelola rasa marah, cemas, dan kecewa", "Menyampaikan pendapat dengan santun", "Membuat jadwal belajar yang teratur", "Menentukan cita-cita yang sesuai dengan minat dan kemampuanku"],
  ["Mengatasi rasa cemas dan tekanan", "Menyelesaikan konflik dengan teman", "Mencatat dan merangkum pelajaran", "Memahami hubungan mata pelajaran dengan pilihan karier"],
  ["Mengatur waktu belajar, istirahat, dan kegiatan lain", "Bekerja sama dalam kelompok atau organisasi", "Menyiapkan diri menghadapi ujian", "Merencanakan pendidikan setelah lulus SMA, SMK, atau MA"],
  ["Menjaga kesehatan fisik dan kualitas tidur", "Menolak ajakan yang merugikan", "Mengatasi rasa malas dan kebiasaan menunda-nunda tugas", "Mengembangkan keterampilan di luar pelajaran"],
  ["Bersikap jujur dan bertanggung jawab", "Menghargai perbedaan pendapat dan latar belakang", "Berani bertanya kepada guru saat belum paham", "Memahami pilihan program studi di perguruan tinggi"],
  ["Mengambil keputusan secara mandiri", "Menghadapi ejekan, perundungan, atau dijauhi teman", "Mengejar pelajaran yang tertinggal", "Mencari informasi jalur masuk perguruan tinggi"],
  ["Memahami diriku menjelang dewasa", "Menjaga hubungan baik dengan orang tua", "Mengerjakan tugas tepat waktu", "Mencari tahu beasiswa dan bantuan biaya kuliah"],
  ["Memakai HP dan media sosial dengan bijak", "Bergaul secara sehat dengan lawan jenis", "Memilih mata pelajaran atau peminatan yang tepat", "Mempertimbangkan pilihan kuliah, bekerja, atau berwirausaha"],
  ["Mengenali dan menamai perasaan yang kurasakan", "Meminta maaf dan memaafkan teman", "Memahami bacaan dan soal yang panjang", "Mengetahui kekuatanku yang dibutuhkan di dunia kerja"],
  ["Bangkit kembali setelah gagal atau kecewa", "Mendengarkan teman dengan sungguh-sungguh", "Mengurangi kecemasan saat ujian", "Menyiapkan CV dan memperkenalkan diriku dengan baik"],
  ["Menghargai diri sendiri tanpa terus membandingkan dengan orang lain", "Menjaga etika dan keamanan di media sosial", "Memakai internet dan kecerdasan buatan (AI) dengan jujur untuk belajar", "Melatih keterampilan wawancara dan presentasi diri"],
  ["Merumuskan nilai dan prinsip hidup yang kupegang", "Membicarakan masalah dengan orang tua atau keluarga", "Belajar kelompok bersama teman dengan efektif", "Mempersiapkan diri menghadapi tes masuk perguruan tinggi atau tes kerja"],
  ["Menjaga kebiasaan hidup yang sehat", "Menunjukkan kepedulian kepada orang lain", "Menentukan target prestasi belajar", "Membuat keputusan karier yang realistis dan siap kutanggung"],
]);

// Penjelasan bidang karier untuk murid, menurut jenjang.
export const AKPD_KARIER = {
  sd: "masa depanmu, seperti cita-cita, pekerjaan, dan sekolah berikutnya",
  smp: "masa depanmu, seperti minat, pilihan sekolah lanjutan, dan cita-cita",
  sma: "masa depanmu, seperti minat, pilihan jurusan, kuliah, kerja, dan beasiswa",
};
export const JENJANG = { sd: "SD/MI", smp: "SMP/MTs", sma: "SMA/SMK/MA" };
