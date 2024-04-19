async function getTotalJuros(jurosText) {
  const number = Number(jurosText?.match(/\d+/g)[0]);

  // do the match but make sure to include any dots in the number, like 1.499,09
  const secondNumber = Number(
    jurosText
      ?.match(/(\d+\.)*\d+,\d+/g)[0]
      .replace(/\./g, "")
      .replace(",", ".")
  );

  const juros = jurosText ? number * secondNumber : 0;

  return juros;
}

export { getTotalJuros };
