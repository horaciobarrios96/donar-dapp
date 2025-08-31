export type DonationEvent = {
    title: string;
    recipient: `0x${string}`;
    image: string;
  };
  
  export const events: DonationEvent[] = [
    {
      title: "Donar a Escuela",
      recipient: "0x449Ab9Df67E542D0D93BcE61c6D6Ac1E094F83bD",
      image: "/escuela.png",
    },
    {
      title: "Donar por Tsunami",
      recipient: "0x1111111111111111111111111111111111111111",
      image: "/tsunami.png",
    }
  ];
  