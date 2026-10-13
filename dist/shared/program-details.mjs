// Native, keyboard-accessible program information. The cinematic timeline is untouched.
export function bindProgramDetails(doc = document) {
  const dialog = doc.querySelector('#program-details');
  const openers = [...doc.querySelectorAll('[data-program-details]')];
  if (!dialog || !openers.length) return null;
  let opener = null;
  const open = event => {
    opener = event.currentTarget;
    if (!dialog.open) dialog.showModal();
  };
  const close = () => dialog.close();
  openers.forEach(button => button.addEventListener('click', open));
  dialog.querySelector('[data-close-details]').addEventListener('click', close);
  // Keep Home/End/arrow keys inside the dialog rather than seeking the movie behind it.
  dialog.addEventListener('keydown', event => event.stopPropagation());
  dialog.addEventListener('close', () => opener?.focus({preventScroll: true}));
  return { dialog, openers };
}
if (typeof document !== 'undefined') bindProgramDetails(document);
