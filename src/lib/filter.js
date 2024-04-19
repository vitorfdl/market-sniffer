function filterResults(result) {
  function getFirst(number) {
    const newResult = result.slice(0, number);
    return filterResults(newResult);
  }

  function ensureNameRule(name) {
    if (!name) {
      return filterResults(result);
    }

    if (!Array.isArray(name)) {
      name = [name];
    }

    name = name.map((x) => x.trim());
    // const newResult = result.filter((item) => item.title?.toLowerCase().includes(name.toLowerCase()));
    // create a new array filtered by titles that includes any of the names
    const newResult = result.filter((item) => name.some((n) => item.title?.toLowerCase().includes(n.toLowerCase())));

    return filterResults(newResult);
  }

  function sortByPrice(ascOrDesc) {
    const newResult = result.sort((a, b) => (ascOrDesc === "asc" ? a.price - b.price : b.price - a.price));
    return filterResults(newResult);
  }

  function sortBytotalJuros(ascOrDesc) {
    const newResult = result.sort((a, b) => (ascOrDesc === "asc" ? a.totalJuros - b.totalJuros : b.totalJuros - a.totalJuros));
    return filterResults(newResult);
  }

  function filterByJuros(juros) {
    const newResult = result.filter((item) => item.totalJuros <= juros);
    return filterResults(newResult);
  }

  function filterPriceBelow(price) {
    const newResult = result.filter((item) => item.price >= price || item.totalJuros >= price);
    return filterResults(newResult);
  }

  function filterPriceAbove(price) {
    const newResult = result.filter((item) => item.price <= price || item.totalJuros <= price || !item.totalJuros);
    return filterResults(newResult);
  }

  const resultList = {
    result,
    getFirst,
    ensureNameRule,
    sortByPrice,
    sortBytotalJuros,
    filterByJuros,
    filterPriceBelow,
    filterPriceAbove,
  };

  return resultList;
}

export { filterResults };
