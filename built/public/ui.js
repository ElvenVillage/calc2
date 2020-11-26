

document.getElementById('sub').addEventListener('click', () => {
    const body = new URLSearchParams({
        'query': document.getElementById('input-area').value
    });

    fetch('/parse', {
        method: 'POST',
        body: body
    }).then(res => res.text())
    .then(text => document.getElementById('input-area').value = text)
});