document.querySelector('#playground-theme').addEventListener('change', event => {
  document.documentElement.dataset.theme = event.target.value;
});

document.querySelector('#open-dialog').addEventListener('click', () => {
  document.querySelector('dialog').showModal();
});

document.querySelector('.ds-segmented').addEventListener('click', event => {
  if (!event.target.matches('.ds-segment')) return;
  for (const segment of event.currentTarget.querySelectorAll('.ds-segment')) {
    segment.setAttribute('aria-pressed', String(segment === event.target));
  }
});

document.querySelector('.playground-sidebar').addEventListener('click', event => {
  const link = event.target.closest('a');
  if (!link) return;
  event.preventDefault();
  event.currentTarget.querySelector('[aria-current]')?.removeAttribute('aria-current');
  link.setAttribute('aria-current', 'page');
});
