import { BrandMark } from "@/components/brand/BrandMark";
import { Catalog } from "@/components/catalog/Catalog";
import { HouseScrollExperience } from "@/components/experience/HouseScrollExperience";
import { isDatabaseConfigured } from "@/lib/database";
import { listProducts } from "@/lib/product-repository";
import { getWhatsAppHref } from "@/lib/whatsapp";
import styles from "./page.module.css";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function Home() {
  const products = isDatabaseConfigured()
    ? await listProducts({ publishedOnly: true })
    : [];
  const customOrderHref = getWhatsAppHref(
    "Olá! Quero conversar sobre uma peça personalizada da Bellaroma.",
  );

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <a className={styles.headerBrand} href="#inicio" aria-label="Bellaroma, início">
          <BrandMark />
        </a>
        <nav className={styles.navigation} aria-label="Navegação principal">
          <a href="#catalogo">Produtos</a>
          <a href="#feito-a-mao">Feito à mão</a>
          <a href="#contato">Contato</a>
        </nav>
        <a
          className={styles.headerCta}
          href={customOrderHref}
          target="_blank"
          rel="noreferrer"
        >
          Encomendar <span aria-hidden="true">↗</span>
        </a>
      </header>

      <main id="conteudo">
        <HouseScrollExperience />
        <Catalog products={products} />

        <section id="feito-a-mao" className={styles.craft} aria-labelledby="craft-title">
          <div className={styles.craftIntro}>
            <p className={styles.eyebrow}>Nosso jeito de fazer</p>
            <h2 id="craft-title">
              A beleza mora
              <br />
              <em>nos detalhes.</em>
            </h2>
          </div>
          <div className={styles.craftNotes}>
            <article>
              <span>01</span>
              <h3>Escolha cuidadosa</h3>
              <p>Tecidos, aromas e acabamentos escolhidos pelo toque e pela duração.</p>
            </article>
            <article>
              <span>02</span>
              <h3>Feito em pequena escala</h3>
              <p>Cada peça passa pelas mesmas mãos, do primeiro corte ao último ponto.</p>
            </article>
            <article>
              <span>03</span>
              <h3>Do seu jeito</h3>
              <p>Cores e medidas podem acompanhar a história e os espaços da sua casa.</p>
            </article>
          </div>
        </section>

        <section id="contato" className={styles.contact} aria-labelledby="contact-title">
          <div className={styles.contactQuestion}>
            <p className={styles.eyebrow}>Peças sob medida</p>
            <h2 id="contact-title">
              Não encontrou
              <br />
              <em>o que imaginou?</em>
            </h2>
          </div>
          <div className={styles.contactAnswer}>
            <p>
              Conte sua ideia, as medidas e as cores que moram aí. A gente desenha
              uma peça só sua, com calma e em boa conversa.
            </p>
            <a href={customOrderHref} target="_blank" rel="noreferrer">
              Conversar pelo WhatsApp
              <span aria-hidden="true">↗</span>
            </a>
            <small>Atendimento online · Enviamos para todo o Brasil</small>
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        <div className={styles.footerTopline}>
          <p>Costura artesanal para dentro de casa.</p>
          <a href="#inicio">Voltar ao início ↑</a>
        </div>
        <BrandMark className={styles.footerBrand} />
        <div className={styles.footerBottom}>
          <span>© {new Date().getFullYear()} Bellaroma</span>
          <nav aria-label="Navegação do rodapé">
            <a href="#catalogo">Produtos</a>
            <a href="#feito-a-mao">Feito à mão</a>
            <a href="#contato">Contato</a>
          </nav>
          <span>Feito com tempo, em Minas Gerais</span>
        </div>
      </footer>
    </div>
  );
}
