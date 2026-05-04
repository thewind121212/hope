import HomeLanding from "@/components/home/HomeLanding";
import { HomeBackdrop } from "@/components/home/HomeBackdrop";

export default function Home() {
  return (
    <>
      <HomeBackdrop />
      <div className="relative pt-24">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 2xl:max-w-7xl">
          <HomeLanding variant="home" />
        </div>
      </div>
    </>
  );
}
