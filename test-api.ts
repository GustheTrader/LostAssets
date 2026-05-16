async function test() {
  const url = "https://data.ny.gov/resource/enhs-gnt5.json?$limit=5";
  const res = await fetch(url);
  if (res.ok) {
    const data = await res.json();
    console.log(data);
  } else {
    console.log("Status:", res.status);
    console.log(await res.text());
  }
}
test();
