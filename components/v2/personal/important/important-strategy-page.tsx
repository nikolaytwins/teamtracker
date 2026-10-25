"use client";

import "./important-strategy.css";
import Link from "next/link";
import { useEffect, useRef, type CSSProperties } from "react";
import { appPath } from "@/lib/api-url";

function sx(style: Record<string, string>): CSSProperties {
  return style as CSSProperties;
}

export function ImportantStrategyPage() {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const lb = root.querySelector<HTMLElement>("#lb");
    const im = root.querySelector<HTMLImageElement>("#lbi");
    const ct = root.querySelector<HTMLElement>("#lbc");
    const pv = lb?.querySelector<HTMLElement>(".pv");
    const nx = lb?.querySelector<HTMLElement>(".nx");
    const bar = root.querySelector<HTMLElement>("#prog");
    const toc = root.querySelector<HTMLElement>("#toc");
    if (!lb || !im || !ct || !pv || !nx || !bar || !toc) return;

    let set: HTMLAnchorElement[] = [];
    let i = 0;

    function show() {
      const a = set[i];
      const img = a?.querySelector("img");
      if (img) im!.src = img.src;
      const multi = set.length > 1;
      ct!.textContent = multi ? `${i + 1} / ${set.length}` : "";
      pv!.style.display = nx!.style.display = multi ? "" : "none";
    }

    const onZoom = (e: Event) => {
      e.preventDefault();
      const a = e.currentTarget as HTMLAnchorElement;
      const g = a.dataset.g ?? "";
      set = Array.from(root.querySelectorAll<HTMLAnchorElement>(`.zoom[data-g="${g}"]`));
      i = Math.max(0, set.indexOf(a));
      show();
      lb!.classList.add("on");
    };

    const zooms = Array.from(root.querySelectorAll<HTMLAnchorElement>(".zoom"));
    zooms.forEach((a) => a.addEventListener("click", onZoom));

    const close = () => lb!.classList.remove("on");
    const step = (d: number) => {
      if (!set.length) return;
      i = (i + d + set.length) % set.length;
      show();
    };

    const onLbClick = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (t === lb || t.classList.contains("x")) close();
    };
    const onPv = (e: MouseEvent) => {
      e.stopPropagation();
      step(-1);
    };
    const onNx = (e: MouseEvent) => {
      e.stopPropagation();
      step(1);
    };
    const onKey = (e: KeyboardEvent) => {
      if (!lb!.classList.contains("on")) return;
      if (e.key === "Escape") close();
      if (e.key === "ArrowLeft") step(-1);
      if (e.key === "ArrowRight") step(1);
    };

    lb.addEventListener("click", onLbClick);
    pv.addEventListener("click", onPv);
    nx.addEventListener("click", onNx);
    document.addEventListener("keydown", onKey);

    const links = Array.from(toc.querySelectorAll<HTMLAnchorElement>("a"));
    const secs = links.map((l) => root.querySelector(l.getAttribute("href") ?? ""));

    const onScroll = () => {
      const h = root;
      const max = (h.scrollHeight - h.clientHeight) || 1;
      bar!.style.width = `${(h.scrollTop / max) * 100}%`;
      let cur = -1;
      secs.forEach((s, k) => {
        if (s && (s as HTMLElement).getBoundingClientRect().top < 140) cur = k;
      });
      links.forEach((l, k) => {
        const on = k === cur;
        if (on !== l.classList.contains("on")) {
          l.classList.toggle("on", on);
          if (on) {
            toc.scrollTo({
              left: l.offsetLeft - toc.clientWidth / 2 + l.clientWidth / 2,
              behavior: "smooth",
            });
          }
        }
      });
    };

    root.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    return () => {
      zooms.forEach((a) => a.removeEventListener("click", onZoom));
      lb.removeEventListener("click", onLbClick);
      pv.removeEventListener("click", onPv);
      nx.removeEventListener("click", onNx);
      document.removeEventListener("keydown", onKey);
      root.removeEventListener("scroll", onScroll);
    };
  }, []);

  return (
    <div className="vol-imp" ref={rootRef}>
      <div className="prog"><i id="prog" /></div>
      <Link href={appPath("/v2/personal/articles")} className="kick vol-imp-back">
        ← Все статьи
      </Link>
      <nav className="toc" id="toc" aria-label="Разделы">
      <a href="#s1"><span>01</span>Видение</a>
      <a href="#s2"><span>02</span>Три уровня</a>
      <a href="#s3"><span>03</span>Правило</a>
      <a href="#s4"><span>04</span>Аркалиум</a>
      <a href="#s5"><span>05</span>Гипотезы</a>
      <a href="#s6"><span>06</span>Семья</a>
      <a href="#s7"><span>07</span>Окружение</a>
      <a href="#s8"><span>08</span>Сексуальность</a>
      <a href="#s9"><span>09</span>Правила</a>
      <a href="#s10"><span>10</span>Пересмотр</a>
      <a href="#s11"><span>11</span>Бог</a>
      <a href="#s12"><span>12</span>Итог</a>
      </nav>
      <div className="page">

      <header className="card hero" data-screen-label="Обложка">
      <div><div className="kick">Версия 1.0 · 25 октября 2026 года</div><h1 className="h1" style={{marginTop: "12px"}}>Моя стратегия свободы, творчества и капитала · 2026–2029</h1></div>
      <p className="manif"><b>Я не просто ищу способ зарабатывать больше. Я строю жизнь, в которой могу придумывать собственные миры, продукты и компании, воплощать их в реальность, развивать и видеть, как ими пользуются тысячи людей. Деньги нужны мне не вместо этой жизни, а для её свободы и устойчивости.</b></p>
      </header>

      <section className="sec" id="s1" data-screen-label="01 Видение">
      <div className="sh"><span className="n">01</span><h2>Моё видение будущего</h2></div>
      <p className="lbl" style={{marginTop: "0"}}>К 30 годам я хочу</p>
      <div className="vis">
      <div className="wants">
      <div className="want" style={sx({"--c": "var(--blue)"})}><i>01</i><h3>Создавать</h3><p>Моя основная деятельность — придумывать концепции, создавать красивые продукты, разрабатывать новые функции, запускать проекты и развивать их. Я не хочу оставаться вечным исполнителем чужих срочных задач.</p></div>
      <div className="want" style={sx({"--c": "var(--blue)"})}><i>02</i><h3>Владеть</h3><p>У меня есть собственные цифровые продукты или компания с повторяемой выручкой, реальными пользователями и сообществом. Она не зависит полностью от количества лично отработанных часов.</p></div>
      <div className="want" style={sx({"--c": "var(--c-wish)"})}><i>03</i><h3>Иметь финансовую свободу</h3><p>Я стремлюсь к личному доходу 1–3 млн ₽ в месяц и растущему капиталу. Мне не нужно каждый месяц совершать финансовый рывок, чтобы оплачивать следующий.</p></div>
      <div className="want" style={sx({"--c": "var(--c-est)"})}><i>04</i><h3>Создать Аркалиум</h3><p>Моя авторская вселенная постепенно превращается из внутреннего мира в живой продукт, с которым взаимодействуют люди. Это долгосрочная цель, а не ещё один срочный бизнес-план.</p></div>
      <div className="want" style={sx({"--c": "var(--c-warm)"})}><i>05</i><h3>Наслаждаться жизнью</h3><p>Любимые люди, семья, путешествия, красивые места, впечатления, спорт, здоровье, духовность и новые знакомства не должны бесконечно откладываться до достижения финансовых целей.</p></div>
      <div className="want" style={sx({"--c": "var(--c-warm)"})}><i>06</i><h3>Спокойствие вместо выживания</h3><p>Я хочу просыпаться без постоянной тревоги о деньгах, клиентах и завтрашнем дне. Моя жизнь не должна быть бесконечной гонкой, в которой каждый успех лишь компенсирует предыдущие потери.</p></div>
      <div className="want wide" style={sx({"--c": "var(--c-warm)"})}><i>07</i><h3>Удовольствие от пути</h3><p>Я хочу не только достигать больших целей, но и наслаждаться обычными днями: придумывать идеи, красиво воплощать их, наблюдать за развитием собственных проектов и постепенно создавать что-то значимое.</p></div>
      </div>
      <div className="vis-ph">
      <a href="#" className="zoom" data-g="vision"><img src="/important/01-9d7cc117.jpg" alt="Я к 30 годам" /></a>
      <a href="#" className="zoom" data-g="vision"><img src="/important/02-58363d74.jpg" alt="Спокойствие вместо выживания" /></a>
      </div>
      </div>
      <div className="pq">
      <div className="pq-p"><div className="kick">Главный принцип</div><p>Я строю не максимальную занятость, а свободу создавать.</p></div>
      <div className="card pq-q"><div className="kick">Главный вопрос</div><p>Как построить такую жизнь, в которой мне нравится каждый день создавать своё, а деньги, капитал и большие проекты постепенно становятся результатом устойчивой системы?</p><a className="btn btn-b" href={appPath("/v2/personal/life-goals")}>Посмотреть все глобальные цели<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6"></path></svg></a></div>
      </div>
      <p className="lbl">Что должно измениться к октябрю 2029 года</p>
      <div className="crit">
      <div className="card cr" style={sx({"--c": "var(--c-cush)"})}><div className="cr-ic"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 17l6-6 4 4 8-8"></path><path d="M15 7h6v6"></path></svg></div><h3>Деньги</h3><p>Капитал вырос, а несколько слабых месяцев больше не уничтожают результат полугода.</p></div>
      <div className="card cr" style={sx({"--c": "var(--c-est)"})}><div className="cr-ic"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 11l9-7 9 7"></path><path d="M5 10v10h14V10"></path></svg></div><h3>Дом</h3><p>Есть собственное жильё либо накопленный взнос и финансово безопасный, реалистичный план покупки.</p></div>
      <div className="card cr" style={sx({"--c": "var(--c-warm)"})}><div className="cr-ic"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"></path></svg></div><h3>Семья</h3><p>Вы с Лерой определились с браком, сроками и совместным будущим — без бесконечного ожидания богатства.</p></div>
      <div className="card cr" style={sx({"--c": "var(--c-wish)"})}><div className="cr-ic"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l2.5 5.5L20 9l-4 4 1 6-5-3-5 3 1-6-4-4 5.5-.5z"></path></svg></div><h3>Созидание</h3><p>Есть хотя бы один значимый собственный проект с подтверждённой ценностью, а не десятки незавершённых запусков.</p></div>
      </div>
      </section>

      <section className="sec" id="s2" data-screen-label="02 Три уровня">
      <div className="sh"><span className="n">02</span><h2>Три стратегических уровня</h2></div>
      <div className="lv-map">
      <a className="card lvm" href="#lv1" style={sx({"--c": "var(--c-cush)"})}><b>I</b><div><strong>Финансовая база</strong><span>500 000 ₽ в месяц к весне 2027</span></div></a>
      <a className="card lvm" href="#lv2" style={sx({"--c": "var(--c-warm)"})}><b>II</b><div><strong>Личный бренд и медиа</strong><span>YouTube и Instagram NIK TWINS</span></div></a>
      <a className="card lvm" href="#lv3" style={sx({"--c": "var(--c-est)"})}><b>III</b><div><strong>Продуктовая компания</strong><span>Собственный цифровой продукт</span></div></a>
      </div>

      <article className="card lv" id="lv1" style={sx({"--c": "var(--c-cush)"})}>
      <div className="lv-t"><div className="lv-r">I</div><div><div className="kick">Уровень I</div><h3>Финансовая база</h3></div></div>
      <div className="stat"><div><div className="kick">Цель</div><b>500 000 ₽</b></div><span>личного месячного дохода к весне 2027 года</span></div>
      <div><div className="kick" style={{marginBottom: "12px"}}>Основной путь — комбинация</div>
      <div className="g3">
      <div className="box"><b className="t">Дорогой найм или долгосрочный контракт</b><span className="m">200–250 тыс. ₽</span><p>в месяц за полную работу или 150–180 тыс. за part-time</p></div>
      <div className="box"><b className="t">TwinLabs</b><p>Прибыльные клиентские проекты, включая дизайн, разработку и цифровые сервисы.</p></div>
      <div className="box"><b className="t">Повторяемые источники</b><p>Постепенный поиск более дорогих задач и повторяемых источников клиентов.</p></div>
      </div></div>
      <p className="hl">Финансовая база нужна, чтобы обеспечить жизнь и инвестировать в собственные проекты, а не для того, чтобы навсегда остаться подрядчиком.</p>
      </article>

      <article className="card lv" id="lv2" style={sx({"--c": "var(--c-warm)"})}>
      <div className="lv-t"><div className="lv-r">II</div><div><div className="kick">Уровень II</div><h3>Личный бренд и медиа</h3></div></div>
      <p className="goal">Цель: развивать YouTube и Instagram NIK TWINS, собирать аудиторию и превращать её в собственный источник дохода.</p>
      <div className="aud">
      <div className="aud-c"><div className="aud-h"><b>100 тыс.<small>YouTube</small></b><span>Цель · октябрь 2029</span></div><a href="#" className="zoom" data-g="aud"><img src="/important/03-264cdab2.jpg" alt="YouTube: 100 тыс. подписчиков" /></a></div>
      <div className="aud-c"><div className="aud-h"><b>50 тыс.<small>Instagram</small></b><span>Цель · октябрь 2029</span></div><a href="#" className="zoom" data-g="aud"><img src="/important/04-76024bb4.jpg" alt="Instagram: 50 тыс. подписчиков" /></a></div>
      </div>
      <div className="g2">
      <div className="box"><div className="kick">Основные направления</div>
      <ul className="li" style={sx({"--c": "var(--c-warm)"})}>
      <li><span><b>YouTube</b> — широкий контент о саморазвитии, ИИ, целях и личных экспериментах.</span></li>
      <li><span><b>Instagram</b> — короткий контент, развитие личного бренда и привлечение новой аудитории.</span></li>
      <li><span><b>ИИ-школа</b> — предзапись на практикум через описание роликов. Полноценный запуск только после подтверждения спроса.</span></li>
      <li><span><b>Платное сообщество</b> — возможное продолжение школы с ежемесячной подпиской.</span></li>
      <li><span><b>Зарубежный Instagram</b> — постепенный выход на международную аудиторию и проверка возможностей монетизации, перевод всех единиц контента.</span></li>
      </ul></div>
      <div style={{display: "flex", flexDirection: "column", gap: "14px"}}>
      <div className="box"><div className="kick">Этапы</div><div className="stg"><div><span className="kick" style={{color: "var(--c-warm)"}}>Первый этап</span><b>YouTube 2 раза в месяц</b></div><div><span className="kick" style={{color: "var(--c-warm)"}}>Второй этап</span><b>Подключение Instagram, 2 рилса в неделю + 1 карусель в неделю</b></div></div></div>
      <p className="hl" style={{flex: "1"}}><span><small>Главный принцип</small>Сначала аудитория и подтверждённый спрос, потом создание образовательных продуктов. Не превращать медиа в ежедневный конвейер контента.</span></p>
      </div>
      </div>
      <div><div style={{display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "12px", marginBottom: "12px", flexWrap: "wrap"}}><div className="kick">Визуал личного бренда</div><span style={{fontSize: "13px", color: "var(--ink-400)"}}>Нажми, чтобы увеличить</span></div>
      <div className="gal">
      <a href="#" className="zoom" data-g="media" style={sx({"--r": "2.5"})}><img src="/important/05-7a4170e9.jpg" alt="Медиа-стиль 1" /></a>
      <a href="#" className="zoom" data-g="media" style={sx({"--r": "1.78"})}><img src="/important/06-f1dc2f29.jpg" alt="Медиа-стиль 2" /></a>
      <a href="#" className="zoom" data-g="media" style={sx({"--r": ".99"})}><img src="/important/07-147e84cd.jpg" alt="Медиа-стиль 3" /></a>
      <a href="#" className="zoom" data-g="media" style={sx({"--r": "1.5"})}><img src="/important/08-984849f8.jpg" alt="Медиа-стиль 4" /></a>
      <a href="#" className="zoom" data-g="media" style={sx({"--r": ".46"})}><img src="/important/09-6c9c66f5.jpg" alt="Медиа-стиль 5" /></a>
      <a href="#" className="zoom" data-g="media" style={sx({"--r": ".46"})}><img src="/important/10-a5ddae61.jpg" alt="Медиа-стиль 6" /></a>
      </div></div>
      <a className="btn btn-w" href="https://hypeman.twinlabs.ru/strategy" target="_blank" rel="noopener">Прочитать полную стратегию<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 17L17 7M9 7h8v8"></path></svg></a>
      </article>

      <article className="card lv" id="lv3" style={sx({"--c": "var(--c-est)"})}>
      <div className="lv-t"><div className="lv-r">III</div><div><div className="kick">Уровень III</div><h3>Собственная продуктовая компания</h3></div></div>
      <p className="goal">Главная предпринимательская ставка на 2027 год — создание собственного цифрового продукта с перспективой повторяемой выручки.</p>
      <div><div className="kick" style={{marginBottom: "12px"}}>Важны три свойства</div>
      <div className="g3">
      <div className="prop"><i>1</i><p>Пользователи <b>регулярно</b> получают реальную пользу.</p></div>
      <div className="prop"><i>2</i><p>Вокруг продукта может сформироваться сообщество.</p></div>
      <div className="prop"><i>3</i><p>Продукт способен вырасти в самостоятельный большой бизнес.</p></div>
      </div></div>
      <div className="g2">
      <div className="box ok"><div className="kick">Моя желаемая роль</div><ul className="li ok"><li><span>Придумывать продуктовую концепцию.</span></li><li><span>Создавать визуальную систему и интерфейсы.</span></li><li><span>Разрабатывать первые версии.</span></li><li><span>Придумывать новые функции, обновления и маркетинговые кампании.</span></li><li><span>Участвовать в определении стратегии продукта.</span></li></ul></div>
      <div className="box no"><div className="kick">Моя нежелательная долгосрочная роль</div><ul className="li no"><li><span>Постоянное выполнение типовых задач.</span></li><li><span>Бесконечная срочная клиентская работа.</span></li><li><span>Ручное выполнение всех операций.</span></li><li><span>Ежедневное управление большой командой.</span></li><li><span>Однообразное привлечение покупателей без новых гипотез и экспериментов.</span></li></ul></div>
      </div>
      <p className="hl"><span><small>Ключевая организационная задача</small>Построить бизнес, в котором я остаюсь продуктовым и творческим руководителем, а повторяемые операции постепенно стандартизируются, автоматизируются и делегируются.</span></p>
      <div><div className="kick" style={{marginBottom: "12px"}}>Кандидаты сейчас</div><div className="chips"><span>Qmagic</span><span>Hypeman</span><span>Kopernik</span><span>Импульс (школа и / или подписка)</span></div></div>
      </article>
      </section>

      <section className="sec" id="s3" data-screen-label="03 Правило">
      <div className="sh"><span className="n">03</span><h2>Правило</h2></div>
      <div className="eq">
      <div className="eq-c main"><div className="kick">Самое важное</div><b>Финансовая база</b><p>Финансовая база — это самое важное, что может быть.</p></div>
      <div className="op">+</div>
      <div className="card eq-c" style={sx({"--c": "var(--c-warm)"})}><div className="kick">Минимальный формат</div><b>Личный бренд</b><p>Спонсирует будущее в минимальном формате: лучше что-то, чем ничего, нет жёсткой привязанности и обязательства.</p></div>
      <div className="op">+</div>
      <div className="card eq-c" style={sx({"--c": "var(--c-est)"})}><div className="kick">1 в момент времени</div><b>1 эксперимент</b><p>Который может вывести на 1–3 млн дохода в будущем.</p></div>
      </div>
      </section>

      <section className="sec" id="s4" data-screen-label="04 Аркалиум">
      <div className="sh"><span className="n">04</span><h2>Аркалиум — отдельная звезда моей стратегии</h2></div>
      <div className="card arc">
      <p className="arc-in">Аркалиум — потенциальная живая развлекательная вселенная с историями, персонажами, взаимодействием людей и возможностью появления фильмов, игр и других продуктов.</p>
      <div className="arc-g">
      <div className="arc-c"><div className="y">2026</div><p>Творчество по вдохновению, но без жертв сном, финансовой устойчивости или обязательствам. За 1 сессию маленький, но законченный результат.</p></div>
      <div className="arc-c"><div className="y">2027</div><p>Определить первый реалистичный публичный или коммерческий формат Аркалиума.</p><p>Формат не выбран заранее. Он должен соответствовать силе идеи, реальным компетенциям, бюджету и интересу аудитории.</p></div>
      <div className="arc-c"><div className="kick" style={{color: "var(--c-est)"}}>Условия перехода к активному производству</div><ol className="conds"><li>Есть сильная законченная концепция первого зрительского или игрового опыта.</li><li>Понятны бюджет, участники, сроки и необходимые компетенции.</li><li>Есть финансовый запас, позволяющий безопасно проверить формат.</li><li>Есть способ привлечь первых зрителей или игроков.</li><li>Проект не требует отказаться от финансовой базы ради неподтверждённого результата.</li></ol></div>
      </div>
      <p style={{fontSize: "14.5px", lineHeight: "1.55", color: "var(--ink-600)"}}>Успешная IT-компания может помочь финансировать Аркалиум, но её успех не является обязательным разрешением начать.</p>
      <p className="hl" style={sx({"--c": "var(--c-est)", fontSize: "18px"})}>Аркалиум нельзя забывать, но и нельзя заставлять зарабатывать раньше времени.</p>
      </div>
      </section>

      <section className="sec" id="s5" data-screen-label="05 Гипотезы">
      <div className="sh"><span className="n">05</span><h2>Проверка коммерческих гипотез</h2></div>
      <div className="card" style={{padding: "24px 26px", display: "flex", flexDirection: "column", gap: "16px"}}>
      <div><div className="kick" style={{color: "var(--blue)"}}>Правило одного активного независимого эксперимента</div><p style={{fontSize: "17px", lineHeight: "1.5", fontWeight: "500", marginTop: "8px"}}>В один период я не запускаю одновременно колбасы, полноценную школу, SaaS и ещё один отдельный бизнес.</p></div>
      <div><div className="kick" style={{marginBottom: "10px"}}>У каждой гипотезы есть этап</div>
      <div className="pipe" style={{padding: "0"}}><div><i>1</i>Идея</div><div><i>2</i>Проверка спроса</div><div><i>3</i>Небольшой платный тест</div><div><i>4</i>Повторение продаж</div><div><i>5</i>Масштабирование</div></div></div>
      <p className="hl" style={sx({"--c": "var(--blue)"})}>Переходить к следующему этапу можно по результатам, а не по вдохновению.</p>
      </div>
      <div className="hyps">
      <div className="card hy"><div className="hy-t"><h3>Колбасы</h3><span className="tag now">Ноябрь</span></div><p>Проверить локальный спрос, себестоимость заказов после логистики, повторные покупки и реальную прибыль.</p><p className="w">Продолжать расширение только после получения убедительных результатов.</p></div>
      <div className="card hy"><div className="hy-t"><h3>ИИ-практикум</h3></div><p>Сначала предзапись и разговоры с потенциальными учениками. Затем небольшой платный набор.</p><p className="w">Создание большой программы до продаж запрещено собственной стратегией.</p></div>
      <div className="card hy"><div className="hy-t"><h3>Платная подписка</h3></div><p>Проверить не только желание вступить, но и причины платить повторно: новые практические результаты, полезные связи, совместная деятельность, обновления.</p><p className="w">Не строить подписку, если её ценность зависит от моего ежедневного присутствия.</p></div>
      <div className="card hy"><div className="hy-t"><h3>Qmagic и другие SaaS</h3></div><p>Начинать не с списка функций, а с пользователей, которым существующие решения недостаточны.</p><p className="w">Не выбирать продукт только по его технологической привлекательности.</p></div>
      </div>
      </section>

      <section className="sec" id="s6" data-screen-label="06 Семья">
      <div className="sh"><span className="n">06</span><h2>Семья, отношения и качество жизни</h2></div>
      <p className="sub" style={{marginTop: "-4px"}}>Свадьба и семья: не ставить жизнь в зависимость от бизнес-успеха. По твоим раскладам возник символически последовательный сценарий:</p>
      <div className="fam">
      <div className="card fm" style={sx({"--c": "var(--c-wish)"})}><a href="#" className="zoom" data-g="fam"><img src="/important/11-4cadc828.jpg" alt="Помолвка" style={{objectPosition: "45% 50%"}} /></a><div className="fm-b"><div className="fm-y">2027</div><h3>Помолвка</h3><div className="fm-c">Паж жезлов — начало нового этапа</div></div></div>
      <div className="card fm" style={sx({"--c": "var(--c-warm)"})}><a href="#" className="zoom" data-g="fam"><img src="/important/12-29a5c0ad.jpg" alt="Свадьба" /></a><div className="fm-b"><div className="fm-y">2028</div><h3>Свадьба</h3><div className="fm-c">Влюблённые — совместный выбор</div></div></div>
      <div className="card fm" style={sx({"--c": "var(--c-est)"})}><a href="#" className="zoom" data-g="fam"><img src="/important/13-2affafa3.jpg" alt="Укрепление быта" /></a><div className="fm-b"><div className="fm-y">2029</div><h3>Укрепление быта</h3><div className="fm-c">Король пентаклей — материальная устойчивость</div></div></div>
      <div className="card fm" style={sx({"--c": "var(--c-cush)"})}><a href="#" className="zoom" data-g="fam"><img src="/important/14-203ab1a8.jpg" alt="Первый ребёнок" /></a><div className="fm-b"><div className="fm-y">2030–2031</div><h3>Первый ребёнок</h3></div></div>
      <div className="card fm" style={sx({"--c": "var(--c-rose)"})}><a href="#" className="zoom" data-g="fam"><img src="/important/15-65e6156a.jpg" alt="Второй ребёнок" /></a><div className="fm-b"><div className="fm-y">2032–2033</div><h3>Второй ребёнок</h3></div></div>
      </div>
      <div className="card steps">
      <div className="st"><div className="st-y">2027</div><div><h3>Выбрать реальную жилищную цель</h3><p>Определиться с городом, форматом жилья, бюджетом, необходимым первоначальным взносом и условиями кредитования.</p><p className="warn">Не выбирать Москву или Ростов только на основании карт. Учитывать работу, безопасность, планы семьи и реальные цены.</p></div></div>
      <div className="st"><div className="st-y">2027–2028</div><div><h3>Создать отдельный жилищный фонд</h3><p>После обеспечения резерва безопасности направлять согласованную долю свободного денежного потока на первоначальный взнос.</p><p className="warn">Покупку автомобиля не ставить впереди этой цели без подтверждённой практической необходимости.</p></div></div>
      <div className="st"><div className="st-y">2028–2029</div><div><h3>Решение о покупке</h3><p>Проверить доход, резерв, ставку кредита, полную стоимость владения и запас на непредвиденные обстоятельства.</p><p className="warn">Если условия остаются невыгодными — продолжать накапливать капитал. Не покупать только ради соблюдения символического срока.</p></div></div>
      </div>
      </section>

      <section className="sec" id="s7" data-screen-label="07 Окружение">
      <div className="sh"><span className="n">07</span><h2>Окружение и связи</h2></div>
      <p className="sub" style={{marginTop: "-4px"}}>Одна из задач ближайших лет — расширять круг людей, с которыми можно создавать продукты, обсуждать идеи и запускать проекты.</p>
      <div className="env">
      <div className="stat"><div><div className="kick">Ориентир на следующий год</div><b>5–7</b></div><p>значимых новых профессиональных или творческих связей, а не десятки формальных знакомств.</p><p className="s">Не нужно превращать каждое знакомство в поиск клиента.</p></div>
      <div className="card env-l"><div className="kick" style={{marginBottom: "10px"}}>Интересующие категории</div>
      <ul className="ppl">
      <li><i>01</i>Создатели цифровых продуктов.</li>
      <li><i>02</i>Предприниматели с реальным опытом масштабирования.</li>
      <li><i>03</i>Разработчики и технологические партнёры.</li>
      <li><i>04</i>Сценаристы, режиссёры, игровые разработчики и другие потенциальные участники будущего Аркалиума.</li>
      <li><i>05</i>Люди, с которыми приятно общаться независимо от коммерческой выгоды.</li>
      </ul></div>
      </div>
      </section>

      <section className="sec" id="s8" data-screen-label="08 Сексуальность">
      <div className="sh"><span className="n">08</span><h2>Сексуальность и впечатления</h2></div>
      <div className="sx">
      <div className="card sx-t">
      <p className="goal"><span style={{color: "var(--c-rose)"}}>Цель —</span> сохранять страсть, чувственность, привлекательность и разнообразие впечатлений, не превращая их в обязательные достижения.</p>
      <ul className="li" style={sx({"--c": "var(--c-rose)"})}>
      <li><span>Не подавлять свои желания и фантазии, но и не ставить сроки их реализации.</span></li>
      <li><span>Допускать новые впечатления, если они совместимы с моими ценностями, отношениями и договорённостями.</span></li>
      <li><span>Не превращать сексуальные приключения в отдельный проект, требующий денег, времени и постоянного внимания.</span></li>
      <li><span>Сохранять честность, добровольное согласие и уважение к границам всех участников.</span></li>
      </ul>
      <p className="hl" style={sx({"--c": "var(--c-rose)"})}><span><small>Принцип</small>Сексуальность — часть красивой и насыщенной жизни, а не ещё одна цель, которую нужно обязательно выполнить.</span></p>
      <div className="sx-x"><p>Не ищешь специально тройнички, не составляешь планы реализации, не устанавливаешь сроки.</p><p>При этом продолжаешь наслаждаться романтикой, флиртом в согласованных границах, эстетикой, привлекательностью и возможными впечатлениями.</p><p>Подробные фантазии, сценарии и визуализации — на отдельной странице «Сексуальность», к которой я возвращаюсь по собственному желанию.</p></div>
      <a className="btn btn-w" href={appPath("/v2/personal/sexuality")}>Прочитать статью полностью<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 17L17 7M9 7h8v8"></path></svg></a>
      </div>
      <div className="sx-ph">
      <a href="#" className="zoom" data-g="sx"><img src="/important/16-4b94ad4e.jpg" alt="Впечатления 1" /></a>
      <a href="#" className="zoom" data-g="sx"><img src="/important/17-6f66910c.jpg" alt="Впечатления 2" /></a>
      </div>
      </div>
      </section>

      <section className="sec" id="s9" data-screen-label="09 Правила">
      <div className="sh"><span className="n">09</span><h2>Пять важных правил</h2></div>
      <div className="rules">
      <div className="card ru"><div className="ru-n">1</div><div><h3>Не повышать уровень жизни на основании одного удачного месяца.</h3><p>Новый постоянный расход допустим только тогда, когда его покрывает устойчивый доход и остаётся финансовый запас. Особенно важно это в отношении аренды, найма сотрудников и дорогих подписок.</p></div></div>
      <div className="card ru"><div className="ru-n">2</div><div><h3>Не менять основную экономическую модель из-за нового вдохновения.</h3><p>Новые идеи можно исследовать. Но переходить от выбранной модели к следующей — только после завершённой проверки, возникновения неприемлемых рисков или появления объективно более выгодной возможности.</p></div></div>
      <div className="card ru"><div className="ru-n">3</div><div><h3>Не превращать Таро в бесконечную перепроверку уже принятых решений.</h3><p>Таро может помогать формулировать неожиданные вопросы. Но если после решения нет новых фактов, ещё один расклад не обязан приводить к пересмотру стратегии.</p><p className="x">Это особенно важно сейчас, когда неопределённость будущего вызывает столько боли.</p></div></div>
      <div className="card ru"><div className="ru-n">4</div><div><h3>Не возвращаться в исполнительский конвейер.</h3><p>Если бизнес растёт, но я становлюсь ещё более занятым исполнителем, нужно менять организацию труда, а не считать это окончательным успехом.</p></div></div>
      <div className="card ru"><div className="ru-n">5</div><div><h3>Не подменять действия анализом.</h3><p>Если следующий шаг уже понятен, сначала выполнить его и получить новые данные, прежде чем снова исследовать варианты.</p></div></div>
      <div className="live"><div className="kick">И главное</div><p>Не откладывать жизнь на потом. Жить и кайфовать уже сейчас, встречаться с друзьями, не сидеть вечно в работе.</p></div>
      </div>
      <p className="hl" style={sx({"--c": "var(--blue)", fontSize: "17px"})}>Увеличивать капитал небольшими, но устойчивыми шагами. Развивать окружение. И постепенно создавать собственные активы.</p>
      </section>

      <section className="sec" id="s10" data-screen-label="10 Пересмотр">
      <div className="sh"><span className="n">10</span><h2>Когда разрешено менять стратегию</h2></div>
      <div className="chg">
      <div className="card chg-l"><div className="kick" style={{color: "var(--ok)"}}>Пересматривать месячные приоритеты при существенных событиях</div>
      <ul className="li ok">
      <li><span>Получен долгосрочный контракт, заметно меняющий финансовую ситуацию.</span></li>
      <li><span>Появились подтверждённые платящие покупатели нового продукта.</span></li>
      <li><span>Эксперимент показал убедительную отрицательную экономику.</span></li>
      <li><span>Существенно изменились расходы, доступные ресурсы или здоровье.</span></li>
      <li><span>Проект доказал устойчивый спрос и требует увеличения внимания.</span></li>
      <li><span>Изменилось моё собственное понимание желаемой жизни после реального опыта, а не одной эмоциональной реакции.</span></li>
      </ul></div>
      <div className="chg-r">
      <div className="stop"><div className="kick">Не повод</div><p>Не менять стратегию только потому, что возникла новая идея, тревога или удачный расклад.</p></div>
      <div className="card calm"><div className="kick">В состоянии тревоги</div><p>Не пересматривать жизненную стратегию в состоянии острой тревоги. Сначала проверить факты, отделить реальные угрозы от прогнозов, выполнить ближайшее полезное действие. Крупные решения принимать в более спокойном состоянии.</p></div>
      </div>
      </div>
      </section>

      <section className="sec" id="s11" data-screen-label="11 Бог">
      <div className="sh"><span className="n">11</span><h2>Бог, духовность и внутренние ориентиры</h2></div>
      <div className="card faith">
      <p className="faith-in">Ты очень хочешь, чтобы жизнь наконец изменилась. Но, возможно, ожидание большого изменения стало настолько напряжённым, что даже надежда на лучшее превратилась в дополнительную нагрузку.</p>
      <div className="prayer"><div className="kick">О чём мне молиться</div><p>Боже, помоги мне выйти из жизненного положения, в котором я постоянно борюсь, но не приближаюсь к своим целям. Открой мне возможности, которых я не вижу. Дай мудрости распознать их, смелости изменить привычный путь и сил построить устойчивую жизнь для себя и своей семьи.</p></div>
      <div className="g2">
      <div className="f-c"><b>Ключевая просьба</b><span>Не о способности бороться ещё сильнее, а о возможности перестать постоянно бороться.</span></div>
      <div className="f-c"><span>Ты много просишь о возможностях, деньгах, успехе, реализации идей. Но гораздо реже позволяешь себе простую просьбу:</span><q>«Я устал быть человеком, который всё должен вытянуть самостоятельно. Помоги мне почувствовать устойчивость и опору».</q></div>
      </div>
      <p className="hl" style={sx({"--c": "var(--blue)", fontWeight: "500"})}>Возможно, тебе сейчас нужен не ещё один шанс создать что-то большое, а возможность войти в уже существующую сильную систему, в которой твои способности наконец начнут приносить ощутимый результат.</p>
      <p className="hl" style={sx({"--c": "var(--blue)", fontWeight: "500"})}>Быстро проверить наиболее перспективные возможности, жёстко ограничив ресурсы, а основную ставку временно сделать на поиск устойчивого дохода.</p>
      </div>
      </section>

      <section className="sec" id="s12" data-screen-label="12 Итог">
      <div className="sh"><span className="n">12</span><h2>Итог</h2></div>
      <div className="card sum">
      <p className="manif">Я больше не строю жизнь вокруг страха остаться без денег. Я строю финансовую систему, которая позволит мне создавать собственные продукты, развивать большие идеи и жить интересно уже сейчас.</p>
      <div className="sum-m">
      <div style={sx({"--c": "var(--c-cush)"})}><small>Мои деньги сейчас</small><b>Найм, контракты и TwinLabs</b></div>
      <div style={sx({"--c": "var(--c-est)"})}><small>Будущий коммерческий актив</small><b>Собственные цифровые продукты с повторяемыми продажами</b></div>
      <div style={sx({"--c": "var(--c-warm)"})}><small>Моя дистрибуция</small><b>NIK TWINS и потенциальные сообщества</b></div>
      <div style={sx({"--c": "var(--c-est)"})}><small>Большой творческий горизонт</small><b>Аркалиум</b></div>
      </div>
      <p className="sum-h">Мне не нужно реализовать все идеи одновременно. Мне нужно каждый год становиться свободнее, создавать больше своего и постепенно переходить от продажи труда к владению собственными активами.</p>
      </div>
      </section>

      </div>

      <div className="lb" id="lb" role="dialog" aria-label="Просмотр изображения">
        <button type="button" className="x" aria-label="Закрыть">×</button>
        <button type="button" className="pv" aria-label="Назад">‹</button>
        <img id="lbi" alt="" />
        <button type="button" className="nx" aria-label="Вперёд">›</button>
        <div className="ct" id="lbc" />
      </div>
    </div>
  );
}
