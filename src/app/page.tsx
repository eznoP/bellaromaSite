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
          <a href="#detalhes">Detalhes</a>
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

        <section id="detalhes" className={styles.craft} aria-labelledby="craft-title">
          <div className={styles.craftIntro}>
            <p className={styles.eyebrow}>Detalhes</p>
            <h2 id="craft-title">
              A beleza mora
              <br />
              <em>nos detalhes.</em>
            </h2>
          </div>
          <div className={styles.craftNotes}>
            <article>
              <span>01</span>
              <h3>Feito à mão com carinho</h3>
              <p>Cada peça é produzida com atenção em todas as etapas, do corte ao acabamento.</p>
            </article>
            <article>
              <span>02</span>
              <h3>Acabamento sofisticado</h3>
              <p>Costuras alinhadas, combinações elegantes e detalhes pensados para valorizar cada ambiente.</p>
            </article>
            <article>
              <span>03</span>
              <h3>Qualidade em cada detalhe</h3>
              <p>Materiais selecionados e produção cuidadosa para entregar beleza, resistência e conforto.</p>
            </article>
          </div>
        </section>

        <section id="contato" className={styles.contact} aria-labelledby="contact-title">
          <div className={styles.contactQuestion}>
            <p className={styles.eyebrow}>Peças sob medida</p>
            <h2 id="contact-title">
              Não achou sua
              <br />
              <em>peça desejada?</em>
            </h2>
          </div>
          <div className={styles.contactAnswer}>
            <p>
              Entre em contato e, com um acordo, faremos sua peça dos sonhos!
            </p>
            <a href={customOrderHref} target="_blank" rel="noreferrer">
              Conversar pelo WhatsApp
              <span aria-hidden="true">↗</span>
            </a>
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        <div className={styles.footerTopline}>
          <a href="#inicio">Voltar ao início ↑</a>
        </div>
        <BrandMark className={styles.footerBrand} variant="seal" />
        <div className={styles.footerBottom}>
          <span>© {new Date().getFullYear()} Bellaroma</span>
          <nav aria-label="Navegação do rodapé">
            <a href="#catalogo">Produtos</a>
            <a href="#detalhes">Detalhes</a>
            <a href="#contato">Contato</a>
          </nav>
        </div>
      </footer>
    </div>
  );
}
