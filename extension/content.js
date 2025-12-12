let imgs_links = [
  "https://www.monacograndprixticket.com/media/cache/resolve/med500_450/uploads/yj/yjEkPoxJu0.png",
  "https://cdn-2.motorsport.com/images/amp/YvKQG516/s1000/lewis-hamilton-ferrari.jpg",
  "https://www.autohebdo.fr/app/uploads/2021/05/DPPI_00124015_333.jpg",
  "https://www.autohebdo.fr/app/uploads/2025/04/DPPI_00125007_1235-753x494.jpg"
];

const imgs = document.getElementsByTagName("img");

for (image of imgs) {
    const index = Math.floor(Math.random() * imgs_links.length);
    image.src = imgs_links[index];
}
