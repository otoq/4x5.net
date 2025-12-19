const TASLAR = {
  K: "♔",
  Q: "♕",
  R: "♖",
  B: "♗",
  N: "♘",
  P: "♙",
  k: "♚",
  q: "♛",
  r: "♜",
  b: "♝",
  n: "♞",
  p: "♟",
};

const DEGERLER = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000 };
const KARE_NOTASYON = [
  ["a5", "b5", "c5", "d5"],
  ["a4", "b4", "c4", "d4"],
  ["a3", "b3", "c3", "d3"],
  ["a2", "b2", "c2", "d2"],
  ["a1", "b1", "c1", "d1"],
];

let tahta = [];
let seciliKare = null;
let gecerliHamleler = [];
let beyazSirasi = true;
let oyunBitti = false;
let bilgisayarRengi = "siyah";
let hamleGecmisi = [];
let yakalananlar = { beyaz: [], siyah: [] };
let hamleNumarasi = 0;
let aiDerinlik = 2;
let oyunSuresi = 0;
let zamanSayaci = null;
let sonHamle = null;
let aiCalisiyor = false;

function tahtayiBaslat() {
  tahta = [
    ["r", "q", "k", "r"],
    ["p", "p", "p", "p"],
    [null, null, null, null],
    ["P", "P", "P", "P"],
    ["R", "Q", "K", "R"],
  ];
}

function yeniOyun() {
  tahtayiBaslat();
  seciliKare = null;
  gecerliHamleler = [];
  beyazSirasi = true;
  oyunBitti = false;
  hamleGecmisi = [];
  yakalananlar = { beyaz: [], siyah: [] };
  hamleNumarasi = 0;
  oyunSuresi = 0;
  sonHamle = null;
  aiCalisiyor = false;

  clearInterval(zamanSayaci);
  zamanSayaci = setInterval(() => {
    oyunSuresi++;
    const dk = Math.floor(oyunSuresi / 60)
      .toString()
      .padStart(2, "0");
    const sn = (oyunSuresi % 60).toString().padStart(2, "0");
    document.getElementById("timer").textContent = `⏱️ ${dk}:${sn}`;
  }, 1000);

  tahtayiCiz();
  bilgiGuncelle();
  gecmisiGuncelle();
  yakananGuncelle();
  istatistikGuncelle();

  if (bilgisayarRengi === "beyaz") {
    setTimeout(bilgisayarOyna, 500);
  }
}

function tarafDegistir() {
  bilgisayarRengi = bilgisayarRengi === "beyaz" ? "siyah" : "beyaz";
  const msg = bilgisayarRengi === "beyaz" ? t("switchedToBlack") : t("switchedToWhite"); // Logic inverted in original code? No: if computer is white, human is black.
  // Original: bilgisayarRengi === "beyaz" ? "SİYAH" : "BEYAZ" (Human color)
  // My translation keys: switchedToBlack (Human plays black), switchedToWhite (Human plays white)
  // If computer becomes white, human becomes black.
  bildirimGoster(msg);
  yeniOyun();
}

function geriAl() {
  if (hamleGecmisi.length < 2) return;

  hamleGecmisi.pop();
  const oncekiDurum = hamleGecmisi.pop();

  if (oncekiDurum) {
    tahta = oncekiDurum.tahta.map((s) => [...s]);
    yakalananlar = JSON.parse(JSON.stringify(oncekiDurum.yakalananlar));
    beyazSirasi = true;
    hamleNumarasi = oncekiDurum.hamleNo;
    sonHamle = null;
    tahtayiCiz();
    bilgiGuncelle();
    gecmisiGuncelle();
    yakananGuncelle();
    istatistikGuncelle();
  }
}

function aiSeviyesiDegisti() {
  aiDerinlik = parseInt(document.getElementById("aiLevel").value);
  bildirimGoster(`${t("aiLevelSet")} ${aiDerinlik}`);
}

function togglePanel(which) {
  const panelId = which === "settings" ? "settingsPanel" : "historyPanel";
  const panel = document.getElementById(panelId);
  if (panel) {
    panel.classList.toggle("collapsed");
  }
}

function initMobilePanels() {
  const isMobile = window.innerWidth <= 600;
  const settings = document.getElementById("settingsPanel");
  const history = document.getElementById("historyPanel");
  if (!settings || !history) return;
  if (isMobile) {
    settings.classList.add("collapsed");
    history.classList.add("collapsed");
  } else {
    settings.classList.remove("collapsed");
    history.classList.remove("collapsed");
  }
}

function tahtayiCiz() {
  const tahtaEl = document.getElementById("board");
  tahtaEl.innerHTML = "";

  for (let sat = 0; sat < 5; sat++) {
    for (let sut = 0; sut < 4; sut++) {
      const kare = document.createElement("div");
      kare.className = "square";
      kare.className += (sat + sut) % 2 === 0 ? " light" : " dark";

      const coord = document.createElement("div");
      coord.className = "coord";
      coord.textContent = KARE_NOTASYON[sat][sut];
      kare.appendChild(coord);

      const tas = tahta[sat][sut];
      if (tas) {
        const tasEl = document.createElement("div");
        tasEl.className = "piece";
        tasEl.textContent = TASLAR[tas];
        kare.appendChild(tasEl);
      }

      if (seciliKare && seciliKare.sat === sat && seciliKare.sut === sut) {
        kare.classList.add("selected");
      }

      if (gecerliHamleler.some((h) => h.sat === sat && h.sut === sut)) {
        kare.classList.add("valid");
      }

      if (sonHamle && ((sonHamle.basSat === sat && sonHamle.basSut === sut) || (sonHamle.bitSat === sat && sonHamle.bitSut === sut))) {
        kare.classList.add("last-move");
      }

      kare.onclick = () => kareTiklandi(sat, sut);
      tahtaEl.appendChild(kare);
    }
  }
}

function kareTiklandi(sat, sut) {
  if (oyunBitti || aiCalisiyor) return;

  const oyuncuBeyazMi = bilgisayarRengi === "siyah";
  if ((oyuncuBeyazMi && !beyazSirasi) || (!oyuncuBeyazMi && beyazSirasi)) {
    return;
  }

  if (seciliKare && gecerliHamleler.some((h) => h.sat === sat && h.sut === sut)) {
    hamleYap(seciliKare.sat, seciliKare.sut, sat, sut);
    seciliKare = null;
    gecerliHamleler = [];
    tahtayiCiz();

    if (!oyunBitti) {
      beyazSirasi = !beyazSirasi;
      oyunBittiMiKontrol();
      if (oyunBitti) {
        bilgiGuncelle();
        return;
      }
      bilgiGuncelle();

      const simdiBilgisayarMi = (bilgisayarRengi === "beyaz" && beyazSirasi) || (bilgisayarRengi === "siyah" && !beyazSirasi);
      if (simdiBilgisayarMi) {
        setTimeout(bilgisayarOyna, 400);
      }
    }
    return;
  }

  const tas = tahta[sat][sut];
  if (tas && beyazMi(tas) === beyazSirasi) {
    seciliKare = { sat, sut };
    gecerliHamleler = gecerliHamleleriBul(sat, sut);
    tahtayiCiz();
  } else {
    seciliKare = null;
    gecerliHamleler = [];
    tahtayiCiz();
  }
}

function beyazMi(tas) {
  return tas === tas.toUpperCase();
}

function gecerliHamleleriBul(sat, sut) {
  const tas = tahta[sat][sut];
  if (!tas) return [];

  const hamleler = [];
  const beyaz = beyazMi(tas);
  const tur = tas.toLowerCase();

  if (tur === "p") {
    const yon = beyaz ? -1 : 1;
    if (tahta[sat + yon] && tahta[sat + yon][sut] === null) {
      hamleler.push({ sat: sat + yon, sut });
      const basSat = beyaz ? 3 : 1;
      if (sat === basSat && tahta[sat + 2 * yon][sut] === null) {
        hamleler.push({ sat: sat + 2 * yon, sut });
      }
    }
    for (const ds of [-1, 1]) {
      const yeniSut = sut + ds;
      if (yeniSut >= 0 && yeniSut < 4 && tahta[sat + yon] && tahta[sat + yon][yeniSut]) {
        if (beyazMi(tahta[sat + yon][yeniSut]) !== beyaz) {
          hamleler.push({ sat: sat + yon, sut: yeniSut });
        }
      }
    }
  } else if (tur === "r") {
    cizgiHamlelerEkle(hamleler, sat, sut, beyaz, [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]);
  } else if (tur === "b") {
    cizgiHamlelerEkle(hamleler, sat, sut, beyaz, [
      [1, 1],
      [1, -1],
      [-1, 1],
      [-1, -1],
    ]);
  } else if (tur === "q") {
    cizgiHamlelerEkle(hamleler, sat, sut, beyaz, [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
      [1, 1],
      [1, -1],
      [-1, 1],
      [-1, -1],
    ]);
  } else if (tur === "n") {
    const atHamleler = [
      [2, 1],
      [2, -1],
      [-2, 1],
      [-2, -1],
      [1, 2],
      [1, -2],
      [-1, 2],
      [-1, -2],
    ];
    for (const [ds, dsut] of atHamleler) {
      const yeniSat = sat + ds,
        yeniSut = sut + dsut;
      if (gecerliKare(yeniSat, yeniSut)) {
        const hedef = tahta[yeniSat][yeniSut];
        if (!hedef || beyazMi(hedef) !== beyaz) {
          hamleler.push({ sat: yeniSat, sut: yeniSut });
        }
      }
    }
  } else if (tur === "k") {
    for (let ds = -1; ds <= 1; ds++) {
      for (let dsut = -1; dsut <= 1; dsut++) {
        if (ds === 0 && dsut === 0) continue;
        const yeniSat = sat + ds,
          yeniSut = sut + dsut;
        if (gecerliKare(yeniSat, yeniSut)) {
          const hedef = tahta[yeniSat][yeniSut];
          if (!hedef || beyazMi(hedef) !== beyaz) {
            hamleler.push({ sat: yeniSat, sut: yeniSut });
          }
        }
      }
    }
  }

  return hamleler;
}

function cizgiHamlelerEkle(hamleler, sat, sut, beyaz, yonler) {
  for (const [ds, dsut] of yonler) {
    let ySat = sat + ds,
      ySut = sut + dsut;
    while (gecerliKare(ySat, ySut)) {
      const hedef = tahta[ySat][ySut];
      if (hedef) {
        if (beyazMi(hedef) !== beyaz) {
          hamleler.push({ sat: ySat, sut: ySut });
        }
        break;
      } else {
        hamleler.push({ sat: ySat, sut: ySut });
      }
      ySat += ds;
      ySut += dsut;
    }
  }
}

function gecerliKare(sat, sut) {
  return sat >= 0 && sat < 5 && sut >= 0 && sut < 4;
}

function hamleYap(basSat, basSut, bitSat, bitSut, kaydet = true) {
  sonHamle = { basSat, basSut, bitSat, bitSut };
  const tas = tahta[basSat][basSut];
  const yakalanan = tahta[bitSat][bitSut];

  if (yakalanan) {
    const renk = beyazMi(tas) ? "beyaz" : "siyah";
    yakalananlar[renk].push(yakalanan);
  }

  tahta[bitSat][bitSut] = tas;
  tahta[basSat][basSut] = null;

  const tur = tas.toLowerCase();
  if (tur === "p") {
    if ((beyazMi(tas) && bitSat === 0) || (!beyazMi(tas) && bitSat === 4)) {
      tahta[bitSat][bitSut] = beyazMi(tas) ? "Q" : "q";
    }
  }

  if (kaydet) {
    const hamleNotasyon = `${KARE_NOTASYON[basSat][basSut]}-${KARE_NOTASYON[bitSat][bitSut]}`;
    hamleGecmisi.push({
      tahta: tahta.map((s) => [...s]),
      yakalananlar: JSON.parse(JSON.stringify(yakalananlar)),
      hamleNo: hamleNumarasi,
      notasyon: hamleNotasyon,
      tas: TASLAR[tas],
      yakalanan: yakalanan ? TASLAR[yakalanan] : null,
    });

    if (beyazSirasi) hamleNumarasi++;

    gecmisiGuncelle();
    yakananGuncelle();
    istatistikGuncelle();
  }

  oyunBittiMiKontrol();
}

function oyunBittiMiKontrol() {
  const beyazKralVar = tahta.some((s) => s.some((t) => t === "K"));
  const siyahKralVar = tahta.some((s) => s.some((t) => t === "k"));
  if (!beyazKralVar || !siyahKralVar) {
    oyunBitti = true;
    clearInterval(zamanSayaci);
    bildirimGoster(!beyazKralVar ? t("blackWon") : t("whiteWon"));
    bilgiGuncelle();
    return;
  }
  const tumHamleler = tumGecerliHamleleriBul(beyazSirasi);
  if (tumHamleler.length === 0) {
    oyunBitti = true;
    clearInterval(zamanSayaci);
    bildirimGoster(beyazSirasi ? t("blackWon") : t("whiteWon"));
    bilgiGuncelle();
  }
}

function tumGecerliHamleleriBul(beyazIcin) {
  const hamleler = [];
  for (let s = 0; s < 5; s++) {
    for (let su = 0; su < 4; su++) {
      const tas = tahta[s][su];
      if (tas && beyazMi(tas) === beyazIcin) {
        const tasHamleler = gecerliHamleleriBul(s, su);
        tasHamleler.forEach((h) => hamleler.push({ bas: { s, su }, bit: h }));
      }
    }
  }
  return hamleler;
}

function bilgiGuncelle() {
  const statusEl = document.getElementById("statusText");
  const pulseEl = document.getElementById("pulse");

  if (oyunBitti) {
    statusEl.textContent = beyazSirasi ? t("blackWon") : t("whiteWon");
    pulseEl.style.background = "#e57373";
  } else {
    const sira = beyazSirasi ? t("whitePlaying") : t("blackPlaying");
    const kim = (bilgisayarRengi === "beyaz" && beyazSirasi) || (bilgisayarRengi === "siyah" && !beyazSirasi) ? " 🤖" : " 👤";
    statusEl.textContent = sira + kim;
    pulseEl.style.background = beyazSirasi ? "#4fc3f7" : "#e57373";
  }
}

function gecmisiGuncelle() {
  const gecmisEl = document.getElementById("moveHistory");
  gecmisEl.innerHTML = "";

  hamleGecmisi.forEach((hamle, index) => {
    const div = document.createElement("div");
    div.className = "move-item";

    const hamleNo = Math.floor(index / 2) + 1;

    div.innerHTML = `
<span><span class="move-number">${hamleNo}.</span> ${hamle.tas} ${hamle.notasyon}</span>
${hamle.yakalanan ? `<span>❌ ${hamle.yakalanan}</span>` : ""}
`;

    gecmisEl.appendChild(div);
  });

  gecmisEl.scrollTop = gecmisEl.scrollHeight;
}

function yakananGuncelle() {
  document.getElementById("whiteCaptured").innerHTML = yakalananlar.beyaz.map((t) => `<span class="captured-piece">${TASLAR[t]}</span>`).join("");
  document.getElementById("blackCaptured").innerHTML = yakalananlar.siyah.map((t) => `<span class="captured-piece">${TASLAR[t]}</span>`).join("");
}

function istatistikGuncelle() {
  document.getElementById("moveCount").textContent = hamleGecmisi.length;
  document.getElementById("captureCount").textContent = yakalananlar.beyaz.length + yakalananlar.siyah.length;
}

function bildirimGoster(mesaj) {
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = mesaj;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

function bilgisayarOyna() {
  if (oyunBitti) return;
  aiCalisiyor = true;

  const enIyiHamle = minimaxKok(aiDerinlik);

  if (enIyiHamle) {
    hamleYap(enIyiHamle.bas.s, enIyiHamle.bas.su, enIyiHamle.bit.sat, enIyiHamle.bit.sut);
    beyazSirasi = !beyazSirasi;
    tahtayiCiz();
    oyunBittiMiKontrol();
    if (oyunBitti) {
      bilgiGuncelle();
      aiCalisiyor = false;
      return;
    }
    bilgiGuncelle();
  }
  aiCalisiyor = false;
}

function minimaxKok(derinlik) {
  const hamleler = tumGecerliHamleleriBul(beyazSirasi);
  if (hamleler.length === 0) return null;

  let enIyiSkor = beyazSirasi ? -99999 : 99999;
  let enIyiHamle = hamleler[0];

  for (const hamle of hamleler) {
    const testTahta = tahta.map((s) => [...s]);
    const tas = testTahta[hamle.bas.s][hamle.bas.su];
    testTahta[hamle.bit.sat][hamle.bit.sut] = tas;
    testTahta[hamle.bas.s][hamle.bas.su] = null;

    if (tas.toLowerCase() === "p") {
      if ((beyazMi(tas) && hamle.bit.sat === 0) || (!beyazMi(tas) && hamle.bit.sat === 4)) {
        testTahta[hamle.bit.sat][hamle.bit.sut] = beyazMi(tas) ? "Q" : "q";
      }
    }

    const skor = minimax(testTahta, derinlik - 1, -99999, 99999, !beyazSirasi);

    if (beyazSirasi) {
      if (skor > enIyiSkor) {
        enIyiSkor = skor;
        enIyiHamle = hamle;
      }
    } else {
      if (skor < enIyiSkor) {
        enIyiSkor = skor;
        enIyiHamle = hamle;
      }
    }
  }

  return enIyiHamle;
}

function minimax(testTahta, derinlik, alpha, beta, maksimize) {
  if (derinlik === 0) {
    return tahtayiDegerlendir(testTahta);
  }

  const hamleler = tumGecerliHamleleriBulTest(testTahta, maksimize);

  if (hamleler.length === 0) {
    return maksimize ? -9999 : 9999;
  }

  if (maksimize) {
    let maxSkor = -99999;
    for (const hamle of hamleler) {
      const yeniTahta = testTahta.map((s) => [...s]);
      const tas = yeniTahta[hamle.bas.s][hamle.bas.su];
      yeniTahta[hamle.bit.sat][hamle.bit.sut] = tas;
      yeniTahta[hamle.bas.s][hamle.bas.su] = null;

      if (tas.toLowerCase() === "p") {
        if ((beyazMi(tas) && hamle.bit.sat === 0) || (!beyazMi(tas) && hamle.bit.sat === 4)) {
          yeniTahta[hamle.bit.sat][hamle.bit.sut] = beyazMi(tas) ? "Q" : "q";
        }
      }

      const skor = minimax(yeniTahta, derinlik - 1, alpha, beta, false);
      maxSkor = Math.max(maxSkor, skor);
      alpha = Math.max(alpha, skor);
      if (beta <= alpha) break;
    }
    return maxSkor;
  } else {
    let minSkor = 99999;
    for (const hamle of hamleler) {
      const yeniTahta = testTahta.map((s) => [...s]);
      const tas = yeniTahta[hamle.bas.s][hamle.bas.su];
      yeniTahta[hamle.bit.sat][hamle.bit.sut] = tas;
      yeniTahta[hamle.bas.s][hamle.bas.su] = null;

      if (tas.toLowerCase() === "p") {
        if ((beyazMi(tas) && hamle.bit.sat === 0) || (!beyazMi(tas) && hamle.bit.sat === 4)) {
          yeniTahta[hamle.bit.sat][hamle.bit.sut] = beyazMi(tas) ? "Q" : "q";
        }
      }

      const skor = minimax(yeniTahta, derinlik - 1, alpha, beta, true);
      minSkor = Math.min(minSkor, skor);
      beta = Math.min(beta, skor);
      if (beta <= alpha) break;
    }
    return minSkor;
  }
}

function tumGecerliHamleleriBulTest(testTahta, beyazIcin) {
  const hamleler = [];
  const eskiTahta = tahta;
  tahta = testTahta;

  for (let s = 0; s < 5; s++) {
    for (let su = 0; su < 4; su++) {
      const tas = testTahta[s][su];
      if (tas && beyazMi(tas) === beyazIcin) {
        const tasHamleler = gecerliHamleleriBul(s, su);
        tasHamleler.forEach((h) => hamleler.push({ bas: { s, su }, bit: h }));
      }
    }
  }

  tahta = eskiTahta;
  return hamleler;
}

function tahtayiDegerlendir(testTahta) {
  let skor = 0;

  for (let s = 0; s < 5; s++) {
    for (let su = 0; su < 4; su++) {
      const tas = testTahta[s][su];
      if (tas) {
        let deger = DEGERLER[tas.toLowerCase()];

        if (tas.toLowerCase() === "p") {
          deger += beyazMi(tas) ? (3 - s) * 10 : s * 10;
        }
        if (su === 1 || su === 2) deger += 5;

        skor += beyazMi(tas) ? deger : -deger;
      }
    }
  }

  return skor;
}

yeniOyun();
initMobilePanels();
window.addEventListener("resize", initMobilePanels);

function toggleMobileSettings() {
  const settingsPanel = document.getElementById("settingsPanel");
  settingsPanel.classList.toggle("active");
  document.body.style.overflow = settingsPanel.classList.contains("active") ? "hidden" : "";
}
