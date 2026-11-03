const schedules = {
  rafieva: {
    name: 'РАФИЕВА, 7',
    days: [
      ['Понедельник', [['18:00–19:00', '2019–2020 г. р.'], ['19:00–20:00', '2017–2018 г. р.']]],
      ['Среда', [['18:00–19:00', '2019–2020 г. р.'], ['19:00–20:00', '2017–2018, 2020–2021 г. р.'], ['20:00–21:00', '2014–2016 г. р.']]],
      ['Пятница', [['19:00–20:00', '2020–2021 г. р.'], ['20:00–21:00', '2014–2016 г. р.']]],
    ],
  },
  pritytskogo: {
    name: 'ПРИТЫЦКОГО, 27',
    days: [
      ['Понедельник', [['19:30–20:30', '2018–2021 г. р.'], ['20:30–21:30', '2014–2017 г. р.']]],
      ['Среда', [['19:30–20:30', '2018–2021 г. р.'], ['20:30–21:30', '2014–2017 г. р.']]],
    ],
  },
  chizhovka: {
    name: 'ЧИЖОВКА, ГОЛОДЕДА, 44',
    days: [
      ['Понедельник', [['18:00–19:00', '2018–2020 г. р.'], ['19:00–20:00', '2015–2017 г. р.'], ['20:00–21:00', '2012–2014 г. р.']]],
      ['Среда', [['18:00–19:00', '2018–2020 г. р.'], ['19:00–20:00', '2015–2017 г. р.'], ['20:00–21:00', '2012–2014 г. р.']]],
    ],
  },
  filimonova: {
    name: 'ФИЛИМОНОВА, 55/2',
    days: [
      ['Понедельник', [['19:00–20:00', '2022–2023 г. р.'], ['20:00–21:00', '2016–2018 г. р.']]],
      ['Вторник', [['19:00–20:00', '2019–2021 г. р.'], ['20:00–21:00', '2016–2018 г. р.']]],
      ['Среда', [['19:00–20:00', '2022–2023 г. р.'], ['20:00–21:00', '2016–2018 г. р.']]],
      ['Пятница', [['19:00–20:00', '2019–2021 г. р.'], ['20:00–21:00', '2016–2018 г. р.']]],
    ],
  },
  slesarnaya: {
    name: 'СЛЕСАРНАЯ, 48/4',
    days: [
      ['Вторник', [['18:00–19:00', '2020–2023 г. р.'], ['19:00–20:00', '2017–2019 г. р.']]],
      ['Четверг', [['18:00–19:00', '2020–2023 г. р.'], ['19:00–20:00', '2017–2019 г. р.']]],
    ],
  },
  pobediteley: {
    name: 'ПОБЕДИТЕЛЕЙ, 109',
    days: [
      ['Вторник', [['17:00–18:00', '2019–2022 г. р.'], ['18:00–19:00', '2015–2018 г. р.']]],
      ['Четверг', [['17:00–18:00', '2019–2022 г. р.'], ['18:00–19:00', '2015–2018 г. р.']]],
    ],
  },
  surganova: {
    name: 'СУРГАНОВА, 2А',
    venue: 'СОК «ОЛИМПИЙСКИЙ»',
    days: [
      ['Вторник', [['16:30–18:00', '2010–2012 г. р.'], ['17:30–18:30', '2014–2017 г. р.'], ['18:30–20:00', '2014–2017 г. р.']]],
      ['Четверг', [['16:30–18:00', '2010–2012 г. р.'], ['18:30–20:00', '2014–2017 г. р.']]],
      ['Пятница', [['16:30–18:00', '2010–2012 г. р.'], ['17:30–18:30', '2014–2017 г. р.'], ['18:30–20:00', '2014–2017 г. р.']]],
    ],
  },
  daumana: {
    name: 'ДАУМАНА, 23',
    days: [
      ['Вторник', [['18:00–19:30', '2017–2020 г. р.'], ['19:30–21:00', '2014–2017 г. р.']]],
      ['Четверг', [['18:00–19:30', '2017–2020 г. р.'], ['19:30–21:00', '2014–2017 г. р.']]],
      ['Пятница', [['18:00–19:30', '2017–2018 г. р.'], ['19:30–21:00', '2014–2017 г. р.']]],
    ],
  },
};

const locationButtons = [...document.querySelectorAll('.location-button')];
const resultTitle = document.querySelector('#result-title');
const resultLabel = document.querySelector('.result-label');
const scheduleDays = document.querySelector('#schedule-days');

function renderSchedule(key) {
  const schedule = schedules[key];
  if (!schedule) return;

  locationButtons.forEach((button) => {
    const selected = button.dataset.location === key;
    button.classList.toggle('is-active', selected);
    button.setAttribute('aria-pressed', String(selected));
  });

  const index = locationButtons.findIndex((button) => button.dataset.location === key) + 1;
  resultLabel.textContent = `ВЫБРАННАЯ ПЛОЩАДКА / ${String(index).padStart(2, '0')}`;
  resultTitle.textContent = schedule.name;

  const cards = schedule.days.map(([day, sessions]) => {
    const card = document.createElement('article');
    card.className = 'day-card';
    const title = document.createElement('h4');
    title.textContent = day;
    card.append(title);

    sessions.forEach(([hours, years]) => {
      const row = document.createElement('div');
      row.className = 'session';
      const time = document.createElement('time');
      time.textContent = hours;
      const group = document.createElement('span');
      group.textContent = years;
      row.append(time, group);
      card.append(row);
    });
    return card;
  });

  if (schedule.venue) {
    const venue = document.createElement('p');
    venue.className = 'venue-label';
    venue.textContent = schedule.venue;
    scheduleDays.replaceChildren(venue, ...cards);
  } else {
    scheduleDays.replaceChildren(...cards);
  }
}

locationButtons.forEach((button) => {
  button.addEventListener('click', () => renderSchedule(button.dataset.location));
});
renderSchedule('rafieva');

const menuToggle = document.querySelector('.menu-toggle');
const menu = document.querySelector('#main-nav');

function setMenu(open) {
  menuToggle.setAttribute('aria-expanded', String(open));
  menuToggle.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
  menu.classList.toggle('is-open', open);
}

menuToggle.addEventListener('click', () => setMenu(menuToggle.getAttribute('aria-expanded') !== 'true'));
menu.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => setMenu(false)));
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && menuToggle.getAttribute('aria-expanded') === 'true') {
    setMenu(false);
    menuToggle.focus();
  }
});
document.addEventListener('click', (event) => {
  if (!menu.contains(event.target) && !menuToggle.contains(event.target)) setMenu(false);
});
window.addEventListener('resize', () => {
  if (window.innerWidth > 820) setMenu(false);
});
