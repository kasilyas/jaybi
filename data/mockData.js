import { StoreName } from '../types';
export const MOCK_PRODUCTS = [
    // --- ÉPICERIE (EXISTANTS + NOUVEAUX) ---
    {
        id: '1',
        name: 'Huile de Table Lesieur 5L',
        brand: 'Lesieur',
        category: 'Epicerie',
        image: 'https://api.monpanier.ma/media/cache/sylius_shop_product_thumbnail/70/72/7072a7b8e1f0e4b8e1f0e4b8e1f0e4b8.png',
        unit: 'L',
        weight: 5,
        prices: [
            { store: StoreName.MARJANE, city: 'Casablanca', price: 98.50, lastUpdated: '2024-05-24', available: true },
            { store: StoreName.CARREFOUR, city: 'Casablanca', price: 99.90, lastUpdated: '2024-05-24', available: true },
            { store: StoreName.BIM, city: 'Fès', price: 97.00, lastUpdated: '2024-05-24', available: true }
        ]
    },
    {
        id: '2',
        name: 'Couscous Fin Dari 1kg',
        brand: 'Dari',
        category: 'Epicerie',
        image: 'https://api.monpanier.ma/media/cache/sylius_shop_product_thumbnail/70/72/7072a7b8e1f0e4b8e1f0e4b8e1f0e4b8.png',
        unit: 'kg',
        weight: 1,
        prices: [{ store: StoreName.BIM, city: 'Casablanca', price: 13.90, lastUpdated: '2024-05-24', available: true }, { store: StoreName.MARJANE, city: 'Rabat', price: 14.50, lastUpdated: '2024-05-24', available: true }]
    },
    {
        id: '3',
        name: 'Thé Vert Sultan Grain de Ambre 200g',
        brand: 'Sultan',
        category: 'Epicerie',
        image: 'https://api.monpanier.ma/media/cache/sylius_shop_product_thumbnail/70/72/7072a7b8e1f0e4b8e1f0e4b8e1f0e4b8.png',
        unit: 'g',
        weight: 200,
        prices: [{ store: StoreName.CARREFOUR, city: 'Casablanca', price: 27.20, lastUpdated: '2024-05-24', available: true }, { store: StoreName.MARJANE, city: 'Marrakech', price: 28.00, lastUpdated: '2024-05-24', available: true }]
    },
    {
        id: '5',
        name: 'Pâtes Penne Tria 500g',
        brand: 'Tria',
        category: 'Epicerie',
        image: 'https://api.monpanier.ma/media/cache/sylius_shop_product_thumbnail/70/72/7072a7b8e1f0e4b8e1f0e4b8e1f0e4b8.png',
        unit: 'g',
        weight: 500,
        prices: [{ store: StoreName.BIM, city: 'Casablanca', price: 6.50, lastUpdated: '2024-05-24', available: true }, { store: StoreName.MARJANE, city: 'Casablanca', price: 7.20, lastUpdated: '2024-05-24', available: true }]
    },
    {
        id: '6',
        name: 'Farine Fleur de Mouna 5kg',
        brand: 'Mouna',
        category: 'Epicerie',
        image: 'https://api.monpanier.ma/media/cache/sylius_shop_product_thumbnail/70/72/7072a7b8e1f0e4b8e1f0e4b8e1f0e4b8.png',
        unit: 'kg',
        weight: 5,
        prices: [{ store: StoreName.MARJANE, city: 'Casablanca', price: 29.90, lastUpdated: '2024-05-24', available: true }, { store: StoreName.ASWAK, city: 'Agadir', price: 28.50, lastUpdated: '2024-05-24', available: true }]
    },
    {
        id: '7',
        name: 'Sucre Granulé Cosumar 2kg',
        brand: 'Cosumar',
        category: 'Epicerie',
        image: 'https://api.monpanier.ma/media/cache/sylius_shop_product_thumbnail/70/72/7072a7b8e1f0e4b8e1f0e4b8e1f0e4b8.png',
        unit: 'kg',
        weight: 2,
        isNational: true,
        prices: [{ store: StoreName.MARJANE, city: 'National', price: 12.00, lastUpdated: '2024-05-24', available: true }]
    },
    {
        id: '8',
        name: 'Concentré de Tomate Aicha 380g',
        brand: 'Aicha',
        category: 'Epicerie',
        image: 'https://api.monpanier.ma/media/cache/sylius_shop_product_thumbnail/70/72/7072a7b8e1f0e4b8e1f0e4b8e1f0e4b8.png',
        unit: 'g',
        weight: 380,
        prices: [{ store: StoreName.BIM, city: 'Casablanca', price: 9.80, lastUpdated: '2024-05-24', available: true }, { store: StoreName.CARREFOUR, city: 'Rabat', price: 10.50, lastUpdated: '2024-05-24', available: true }]
    },
    {
        id: '9',
        name: 'Café Samar 225g',
        brand: 'Samar',
        category: 'Epicerie',
        image: 'https://api.monpanier.ma/media/cache/sylius_shop_product_thumbnail/70/72/7072a7b8e1f0e4b8e1f0e4b8e1f0e4b8.png',
        unit: 'g',
        weight: 225,
        prices: [{ store: StoreName.MARJANE, city: 'Casablanca', price: 19.50, lastUpdated: '2024-05-24', available: true }, { store: StoreName.ASWAK, city: 'Tanger', price: 18.90, lastUpdated: '2024-05-24', available: true }]
    },
    {
        id: '10',
        name: 'Lentilles Vertes Luia 500g',
        brand: 'Luia',
        category: 'Epicerie',
        image: 'https://api.monpanier.ma/media/cache/sylius_shop_product_thumbnail/70/72/7072a7b8e1f0e4b8e1f0e4b8e1f0e4b8.png',
        unit: 'g',
        weight: 500,
        prices: [{ store: StoreName.CARREFOUR, city: 'Casablanca', price: 11.00, lastUpdated: '2024-05-24', available: true }]
    },
    // --- CRÈMERIE ---
    {
        id: '4',
        name: 'Lait Entier Centrale 1L',
        brand: 'Centrale',
        category: 'Crèmerie',
        image: 'https://api.monpanier.ma/media/cache/sylius_shop_product_thumbnail/70/72/7072a7b8e1f0e4b8e1f0e4b8e1f0e4b8.png',
        unit: 'L',
        weight: 1,
        prices: [{ store: StoreName.MARJANE, city: 'Casablanca', price: 7.00, lastUpdated: '2024-05-24', available: true }, { store: StoreName.BIM, city: 'Tanger', price: 7.00, lastUpdated: '2024-05-24', available: true }]
    },
    {
        id: '11',
        name: 'Lait Demi-Écrémé Jaouda 1L',
        brand: 'Jaouda',
        category: 'Crèmerie',
        image: 'https://api.monpanier.ma/media/cache/sylius_shop_product_thumbnail/70/72/7072a7b8e1f0e4b8e1f0e4b8e1f0e4b8.png',
        unit: 'L',
        weight: 1,
        prices: [{ store: StoreName.ASWAK, city: 'Casablanca', price: 9.50, lastUpdated: '2024-05-24', available: true }]
    },
    {
        id: '12',
        name: 'Fromage Rouge La Vache Qui Rit 16 Portions',
        brand: 'La Vache Qui Rit',
        category: 'Crèmerie',
        image: 'https://api.monpanier.ma/media/cache/sylius_shop_product_thumbnail/70/72/7072a7b8e1f0e4b8e1f0e4b8e1f0e4b8.png',
        unit: 'unit',
        weight: 16,
        prices: [{ store: StoreName.MARJANE, city: 'Casablanca', price: 15.50, lastUpdated: '2024-05-24', available: true }, { store: StoreName.BIM, city: 'Casablanca', price: 14.90, lastUpdated: '2024-05-24', available: true }]
    },
    {
        id: '13',
        name: 'Beurre Doux Centrale 200g',
        brand: 'Centrale',
        category: 'Crèmerie',
        image: 'https://api.monpanier.ma/media/cache/sylius_shop_product_thumbnail/70/72/7072a7b8e1f0e4b8e1f0e4b8e1f0e4b8.png',
        unit: 'g',
        weight: 200,
        prices: [{ store: StoreName.CARREFOUR, city: 'Casablanca', price: 22.00, lastUpdated: '2024-05-24', available: true }]
    },
    {
        id: '14',
        name: 'Yaourt Vanille Danone 110g',
        brand: 'Danone',
        category: 'Crèmerie',
        image: 'https://api.monpanier.ma/media/cache/sylius_shop_product_thumbnail/70/72/7072a7b8e1f0e4b8e1f0e4b8e1f0e4b8.png',
        unit: 'g',
        weight: 110,
        isNational: true,
        prices: [{ store: StoreName.BIM, city: 'National', price: 2.50, lastUpdated: '2024-05-24', available: true }]
    },
    {
        id: '15',
        name: 'Fromage Edam Boule 1kg',
        brand: 'Marjane Quality',
        category: 'Crèmerie',
        image: 'https://api.monpanier.ma/media/cache/sylius_shop_product_thumbnail/70/72/7072a7b8e1f0e4b8e1f0e4b8e1f0e4b8.png',
        unit: 'kg',
        weight: 1,
        prices: [{ store: StoreName.MARJANE, city: 'Casablanca', price: 89.00, lastUpdated: '2024-05-24', available: true }]
    },
    // --- BOISSONS ---
    {
        id: '16',
        name: 'Eau Minérale Ain Saiss 5L',
        brand: 'Ain Saiss',
        category: 'Boissons',
        image: 'https://api.monpanier.ma/media/cache/sylius_shop_product_thumbnail/70/72/7072a7b8e1f0e4b8e1f0e4b8e1f0e4b8.png',
        unit: 'L',
        weight: 5,
        prices: [{ store: StoreName.MARJANE, city: 'Casablanca', price: 10.50, lastUpdated: '2024-05-24', available: true }, { store: StoreName.ASWAK, city: 'Agadir', price: 9.90, lastUpdated: '2024-05-24', available: true }]
    },
    {
        id: '17',
        name: 'Sidi Ali 1.5L Pack de 6',
        brand: 'Sidi Ali',
        category: 'Boissons',
        image: 'https://api.monpanier.ma/media/cache/sylius_shop_product_thumbnail/70/72/7072a7b8e1f0e4b8e1f0e4b8e1f0e4b8.png',
        unit: 'L',
        weight: 9,
        isNational: true,
        prices: [{ store: StoreName.CARREFOUR, city: 'National', price: 34.00, lastUpdated: '2024-05-24', available: true }]
    },
    {
        id: '18',
        name: 'Coca-Cola 1.5L',
        brand: 'Coca-Cola',
        category: 'Boissons',
        image: 'https://api.monpanier.ma/media/cache/sylius_shop_product_thumbnail/70/72/7072a7b8e1f0e4b8e1f0e4b8e1f0e4b8.png',
        unit: 'L',
        weight: 1.5,
        prices: [{ store: StoreName.BIM, city: 'Casablanca', price: 9.50, lastUpdated: '2024-05-24', available: true }, { store: StoreName.MARJANE, city: 'Casablanca', price: 10.20, lastUpdated: '2024-05-24', available: true }]
    },
    {
        id: '19',
        name: 'Jus d\'Orange Valencia 1L',
        brand: 'Valencia',
        category: 'Boissons',
        image: 'https://api.monpanier.ma/media/cache/sylius_shop_product_thumbnail/70/72/7072a7b8e1f0e4b8e1f0e4b8e1f0e4b8.png',
        unit: 'L',
        weight: 1,
        prices: [{ store: StoreName.MARJANE, city: 'Casablanca', price: 14.90, lastUpdated: '2024-05-24', available: true }, { store: StoreName.CARREFOUR, city: 'Rabat', price: 15.50, lastUpdated: '2024-05-24', available: true }]
    },
    {
        id: '20',
        name: 'Nectar de Pêche Miami 1L',
        brand: 'Miami',
        category: 'Boissons',
        image: 'https://api.monpanier.ma/media/cache/sylius_shop_product_thumbnail/70/72/7072a7b8e1f0e4b8e1f0e4b8e1f0e4b8.png',
        unit: 'L',
        weight: 1,
        prices: [{ store: StoreName.BIM, city: 'Casablanca', price: 8.90, lastUpdated: '2024-05-24', available: true }]
    },
    // --- ENTRETIEN ---
    {
        id: '21',
        name: 'Lessive Poudre Omo 5kg',
        brand: 'Omo',
        category: 'Entretien',
        image: 'https://api.monpanier.ma/media/cache/sylius_shop_product_thumbnail/70/72/7072a7b8e1f0e4b8e1f0e4b8e1f0e4b8.png',
        unit: 'kg',
        weight: 5,
        prices: [{ store: StoreName.MARJANE, city: 'Casablanca', price: 85.00, lastUpdated: '2024-05-24', available: true }, { store: StoreName.CARREFOUR, city: 'Casablanca', price: 89.00, lastUpdated: '2024-05-24', available: true }]
    },
    {
        id: '22',
        name: 'Liquide Vaisselle Maxis 1L',
        brand: 'Maxis',
        category: 'Entretien',
        image: 'https://api.monpanier.ma/media/cache/sylius_shop_product_thumbnail/70/72/7072a7b8e1f0e4b8e1f0e4b8e1f0e4b8.png',
        unit: 'L',
        weight: 1,
        prices: [{ store: StoreName.BIM, city: 'Casablanca', price: 12.50, lastUpdated: '2024-05-24', available: true }]
    },
    {
        id: '23',
        name: 'Javel Ace 2L',
        brand: 'Ace',
        category: 'Entretien',
        image: 'https://api.monpanier.ma/media/cache/sylius_shop_product_thumbnail/70/72/7072a7b8e1f0e4b8e1f0e4b8e1f0e4b8.png',
        unit: 'L',
        weight: 2,
        prices: [{ store: StoreName.MARJANE, city: 'Casablanca', price: 14.00, lastUpdated: '2024-05-24', available: true }]
    },
    {
        id: '24',
        name: 'Papier Toilette Rose 6 Rouleaux',
        brand: 'Rose',
        category: 'Entretien',
        image: 'https://api.monpanier.ma/media/cache/sylius_shop_product_thumbnail/70/72/7072a7b8e1f0e4b8e1f0e4b8e1f0e4b8.png',
        unit: 'unit',
        weight: 6,
        prices: [{ store: StoreName.BIM, city: 'Casablanca', price: 19.90, lastUpdated: '2024-05-24', available: true }]
    },
    {
        id: '25',
        name: 'Adoucissant Ariel 2L',
        brand: 'Ariel',
        category: 'Entretien',
        image: 'https://api.monpanier.ma/media/cache/sylius_shop_product_thumbnail/70/72/7072a7b8e1f0e4b8e1f0e4b8e1f0e4b8.png',
        unit: 'L',
        weight: 2,
        prices: [{ store: StoreName.MARJANE, city: 'Rabat', price: 45.00, lastUpdated: '2024-05-24', available: true }]
    },
    // --- FRUITS & LÉGUMES ---
    {
        id: '26',
        name: 'Pommes de Terre Blanches 1kg',
        brand: 'Ferme Atlas',
        category: 'Fruits & Légumes',
        image: 'https://api.monpanier.ma/media/cache/sylius_shop_product_thumbnail/70/72/7072a7b8e1f0e4b8e1f0e4b8e1f0e4b8.png',
        unit: 'kg',
        weight: 1,
        prices: [{ store: StoreName.MARJANE, city: 'Casablanca', price: 5.50, lastUpdated: '2024-05-24', available: true }, { store: StoreName.BIM, city: 'Casablanca', price: 4.90, lastUpdated: '2024-05-24', available: true }]
    },
    {
        id: '27',
        name: 'Tomates Rondes 1kg',
        brand: 'Souss Fruits',
        category: 'Fruits & Légumes',
        image: 'https://api.monpanier.ma/media/cache/sylius_shop_product_thumbnail/70/72/7072a7b8e1f0e4b8e1f0e4b8e1f0e4b8.png',
        unit: 'kg',
        weight: 1,
        prices: [{ store: StoreName.MARJANE, city: 'Agadir', price: 3.50, lastUpdated: '2024-05-24', available: true }, { store: StoreName.CARREFOUR, city: 'Casablanca', price: 4.80, lastUpdated: '2024-05-24', available: true }]
    },
    {
        id: '28',
        name: 'Oignons Jaunes 1kg',
        brand: 'Souss Fruits',
        category: 'Fruits & Légumes',
        image: 'https://api.monpanier.ma/media/cache/sylius_shop_product_thumbnail/70/72/7072a7b8e1f0e4b8e1f0e4b8e1f0e4b8.png',
        unit: 'kg',
        weight: 1,
        prices: [{ store: StoreName.BIM, city: 'Casablanca', price: 6.00, lastUpdated: '2024-05-24', available: true }]
    },
    {
        id: '29',
        name: 'Pommes Golden 1kg',
        brand: 'Imouzzer',
        category: 'Fruits & Légumes',
        image: 'https://api.monpanier.ma/media/cache/sylius_shop_product_thumbnail/70/72/7072a7b8e1f0e4b8e1f0e4b8e1f0e4b8.png',
        unit: 'kg',
        weight: 1,
        prices: [{ store: StoreName.MARJANE, city: 'Fès', price: 12.00, lastUpdated: '2024-05-24', available: true }, { store: StoreName.CARREFOUR, city: 'Casablanca', price: 15.00, lastUpdated: '2024-05-24', available: true }]
    },
    {
        id: '30',
        name: 'Bananes Locales 1kg',
        brand: 'Souss Fruits',
        category: 'Fruits & Légumes',
        image: 'https://api.monpanier.ma/media/cache/sylius_shop_product_thumbnail/70/72/7072a7b8e1f0e4b8e1f0e4b8e1f0e4b8.png',
        unit: 'kg',
        weight: 1,
        prices: [{ store: StoreName.MARJANE, city: 'Casablanca', price: 11.00, lastUpdated: '2024-05-24', available: true }]
    },
    // --- BOUCHERIE ---
    {
        id: '31',
        name: 'Poulet Entier Nettoyé 1kg',
        brand: 'Koutoubia',
        category: 'Boucherie',
        image: 'https://api.monpanier.ma/media/cache/sylius_shop_product_thumbnail/70/72/7072a7b8e1f0e4b8e1f0e4b8e1f0e4b8.png',
        unit: 'kg',
        weight: 1,
        prices: [{ store: StoreName.MARJANE, city: 'Casablanca', price: 42.00, lastUpdated: '2024-05-24', available: true }, { store: StoreName.CARREFOUR, city: 'Casablanca', price: 45.00, lastUpdated: '2024-05-24', available: true }]
    },
    {
        id: '32',
        name: 'Viande Hachée de Bœuf 500g',
        brand: 'Marjane Quality',
        category: 'Boucherie',
        image: 'https://api.monpanier.ma/media/cache/sylius_shop_product_thumbnail/70/72/7072a7b8e1f0e4b8e1f0e4b8e1f0e4b8.png',
        unit: 'g',
        weight: 500,
        prices: [{ store: StoreName.MARJANE, city: 'Casablanca', price: 55.00, lastUpdated: '2024-05-24', available: true }, { store: StoreName.ASWAK, city: 'Rabat', price: 58.00, lastUpdated: '2024-05-24', available: true }]
    },
    // --- AUTRES ÉPICERIE / BISCUITERIE ---
    {
        id: '33',
        name: 'Biscuits Henry\'s 42g Pack de 10',
        brand: 'Bimo',
        category: 'Epicerie',
        image: 'https://api.monpanier.ma/media/cache/sylius_shop_product_thumbnail/70/72/7072a7b8e1f0e4b8e1f0e4b8e1f0e4b8.png',
        unit: 'unit',
        weight: 10,
        isNational: true,
        prices: [{ store: StoreName.BIM, city: 'National', price: 18.00, lastUpdated: '2024-05-24', available: true }]
    },
    {
        id: '34',
        name: 'Gaufrettes Tonik Pack de 12',
        brand: 'Excelo',
        category: 'Epicerie',
        image: 'https://api.monpanier.ma/media/cache/sylius_shop_product_thumbnail/70/72/7072a7b8e1f0e4b8e1f0e4b8e1f0e4b8.png',
        unit: 'unit',
        weight: 12,
        prices: [{ store: StoreName.MARJANE, city: 'Casablanca', price: 12.00, lastUpdated: '2024-05-24', available: true }]
    },
    {
        id: '35',
        name: 'Chips Lays Sel 150g',
        brand: 'Lays',
        category: 'Epicerie',
        image: 'https://api.monpanier.ma/media/cache/sylius_shop_product_thumbnail/70/72/7072a7b8e1f0e4b8e1f0e4b8e1f0e4b8.png',
        unit: 'g',
        weight: 150,
        prices: [{ store: StoreName.CARREFOUR, city: 'Casablanca', price: 14.50, lastUpdated: '2024-05-24', available: true }]
    },
    {
        id: '36',
        name: 'Confiture de Fraise Aicha 430g',
        brand: 'Aicha',
        category: 'Epicerie',
        image: 'https://api.monpanier.ma/media/cache/sylius_shop_product_thumbnail/70/72/7072a7b8e1f0e4b8e1f0e4b8e1f0e4b8.png',
        unit: 'g',
        weight: 430,
        prices: [{ store: StoreName.MARJANE, city: 'Casablanca', price: 18.50, lastUpdated: '2024-05-24', available: true }, { store: StoreName.BIM, city: 'Marrakech', price: 17.90, lastUpdated: '2024-05-24', available: true }]
    },
    {
        id: '37',
        name: 'Miel Pur Atlas 250g',
        brand: 'Atlas',
        category: 'Epicerie',
        image: 'https://api.monpanier.ma/media/cache/sylius_shop_product_thumbnail/70/72/7072a7b8e1f0e4b8e1f0e4b8e1f0e4b8.png',
        unit: 'g',
        weight: 250,
        prices: [{ store: StoreName.ASWAK, city: 'Casablanca', price: 45.00, lastUpdated: '2024-05-24', available: true }]
    },
    {
        id: '38',
        name: 'Bouillon Bœuf Maggi 8 Cubes',
        brand: 'Maggi',
        category: 'Epicerie',
        image: 'https://api.monpanier.ma/media/cache/sylius_shop_product_thumbnail/70/72/7072a7b8e1f0e4b8e1f0e4b8e1f0e4b8.png',
        unit: 'unit',
        weight: 8,
        isNational: true,
        prices: [{ store: StoreName.BIM, city: 'National', price: 7.50, lastUpdated: '2024-05-24', available: true }]
    },
    {
        id: '39',
        name: 'Levure Chimique Ideal 7g Pack de 10',
        brand: 'Ideal',
        category: 'Epicerie',
        image: 'https://api.monpanier.ma/media/cache/sylius_shop_product_thumbnail/70/72/7072a7b8e1f0e4b8e1f0e4b8e1f0e4b8.png',
        unit: 'unit',
        weight: 10,
        isNational: true,
        prices: [{ store: StoreName.MARJANE, city: 'National', price: 8.50, lastUpdated: '2024-05-24', available: true }]
    },
    {
        id: '40',
        name: 'Chocolat Maruja Noir 100g',
        brand: 'Maruja',
        category: 'Epicerie',
        image: 'https://api.monpanier.ma/media/cache/sylius_shop_product_thumbnail/70/72/7072a7b8e1f0e4b8e1f0e4b8e1f0e4b8.png',
        unit: 'g',
        weight: 100,
        prices: [{ store: StoreName.BIM, city: 'Tanger', price: 10.00, lastUpdated: '2024-05-24', available: true }]
    },
    {
        id: '41',
        name: 'Sardines à l\'Huile Tam 125g',
        brand: 'Tam',
        category: 'Epicerie',
        image: 'https://api.monpanier.ma/media/cache/sylius_shop_product_thumbnail/70/72/7072a7b8e1f0e4b8e1f0e4b8e1f0e4b8.png',
        unit: 'g',
        weight: 125,
        prices: [{ store: StoreName.MARJANE, city: 'Casablanca', price: 6.50, lastUpdated: '2024-05-24', available: true }]
    },
    {
        id: '42',
        name: 'Ketchup Heinz 460g',
        brand: 'Heinz',
        category: 'Epicerie',
        image: 'https://api.monpanier.ma/media/cache/sylius_shop_product_thumbnail/70/72/7072a7b8e1f0e4b8e1f0e4b8e1f0e4b8.png',
        unit: 'g',
        weight: 460,
        prices: [{ store: StoreName.CARREFOUR, city: 'Casablanca', price: 29.00, lastUpdated: '2024-05-24', available: true }]
    },
    {
        id: '43',
        name: 'Mayonnaise Lesieur 470g',
        brand: 'Lesieur',
        category: 'Epicerie',
        image: 'https://api.monpanier.ma/media/cache/sylius_shop_product_thumbnail/70/72/7072a7b8e1f0e4b8e1f0e4b8e1f0e4b8.png',
        unit: 'g',
        weight: 470,
        prices: [{ store: StoreName.MARJANE, city: 'Casablanca', price: 22.50, lastUpdated: '2024-05-24', available: true }]
    },
    {
        id: '44',
        name: 'Cornflakes Kellogg\'s 375g',
        brand: 'Kellogg\'s',
        category: 'Epicerie',
        image: 'https://api.monpanier.ma/media/cache/sylius_shop_product_thumbnail/70/72/7072a7b8e1f0e4b8e1f0e4b8e1f0e4b8.png',
        unit: 'g',
        weight: 375,
        prices: [{ store: StoreName.MARJANE, city: 'Casablanca', price: 35.00, lastUpdated: '2024-05-24', available: true }]
    },
    {
        id: '45',
        name: 'Moutarde Fine Maille 215g',
        brand: 'Maille',
        category: 'Epicerie',
        image: 'https://api.monpanier.ma/media/cache/sylius_shop_product_thumbnail/70/72/7072a7b8e1f0e4b8e1f0e4b8e1f0e4b8.png',
        unit: 'g',
        weight: 215,
        prices: [{ store: StoreName.CARREFOUR, city: 'Rabat', price: 24.00, lastUpdated: '2024-05-24', available: true }]
    },
    {
        id: '46',
        name: 'Chips Pringles Original 165g',
        brand: 'Pringles',
        category: 'Epicerie',
        image: 'https://api.monpanier.ma/media/cache/sylius_shop_product_thumbnail/70/72/7072a7b8e1f0e4b8e1f0e4b8e1f0e4b8.png',
        unit: 'g',
        weight: 165,
        prices: [{ store: StoreName.MARJANE, city: 'Casablanca', price: 28.00, lastUpdated: '2024-05-24', available: true }]
    },
    {
        id: '47',
        name: 'Biscuits Digestifs McVitie\'s 400g',
        brand: 'McVitie\'s',
        category: 'Epicerie',
        image: 'https://api.monpanier.ma/media/cache/sylius_shop_product_thumbnail/70/72/7072a7b8e1f0e4b8e1f0e4b8e1f0e4b8.png',
        unit: 'g',
        weight: 400,
        prices: [{ store: StoreName.BIM, city: 'Casablanca', price: 24.50, lastUpdated: '2024-05-24', available: true }]
    },
    {
        id: '48',
        name: 'Céréales Nesquik 375g',
        brand: 'Nestlé',
        category: 'Epicerie',
        image: 'https://api.monpanier.ma/media/cache/sylius_shop_product_thumbnail/70/72/7072a7b8e1f0e4b8e1f0e4b8e1f0e4b8.png',
        unit: 'g',
        weight: 375,
        prices: [{ store: StoreName.CARREFOUR, city: 'Casablanca', price: 38.00, lastUpdated: '2024-05-24', available: true }]
    },
    {
        id: '49',
        name: 'Haricots Blancs Luia 500g',
        brand: 'Luia',
        category: 'Epicerie',
        image: 'https://api.monpanier.ma/media/cache/sylius_shop_product_thumbnail/70/72/7072a7b8e1f0e4b8e1f0e4b8e1f0e4b8.png',
        unit: 'g',
        weight: 500,
        prices: [{ store: StoreName.BIM, city: 'Casablanca', price: 12.00, lastUpdated: '2024-05-24', available: true }]
    },
    {
        id: '50',
        name: 'Riz Long Blanc Tria 1kg',
        brand: 'Tria',
        category: 'Epicerie',
        image: 'https://api.monpanier.ma/media/cache/sylius_shop_product_thumbnail/70/72/7072a7b8e1f0e4b8e1f0e4b8e1f0e4b8.png',
        unit: 'kg',
        weight: 1,
        prices: [{ store: StoreName.MARJANE, city: 'Casablanca', price: 16.50, lastUpdated: '2024-05-24', available: true }]
    }
];
export const MOCK_PACKS = [
    {
        id: 'pack-ramadan',
        name: 'Pack Essentiel Ramadan',
        description: 'Tout pour votre table du Ftour : lait, dattes, couscous et thé.',
        productIds: ['2', '3', '4', '7', '8'],
        image: '🌙',
        theme: 'ramadan',
        type: 'bundle'
    },
    {
        id: 'pack-entretien',
        name: 'Pack Hygiène Totale',
        description: 'Nettoyez votre foyer avec les meilleures marques à prix réduit.',
        productIds: ['21', '22', '23', '24'],
        image: '🧼',
        theme: 'standard',
        type: 'bundle'
    }
];
export const MOCK_USERS = [
    {
        id: 'USR-001',
        name: 'Amine Tazi',
        email: 'user@qayess.ma',
        role: 'customer',
        tier: 'free',
        savingsScore: 150,
        isPremium: false,
        addresses: [
            { id: 'ADR-001', label: 'Domicile', details: '12 Rue des Orangers, Maârif', city: 'Casablanca', isDefault: true },
            { id: 'ADR-002', label: 'Bureau', details: 'Twin Center, Boulevard Zerktouni', city: 'Casablanca', isDefault: false }
        ]
    },
    {
        id: 'USR-002',
        name: 'Sarah Bennani',
        email: 'premium@qayess.ma',
        role: 'customer',
        tier: 'pack2',
        savingsScore: 3420,
        isPremium: true,
        addresses: []
    },
    {
        id: 'USR-003',
        name: 'Omar Idrissi',
        email: 'tech@qayess.ma',
        role: 'contributor',
        tier: 'pack1',
        savingsScore: 890,
        isPremium: false,
        addresses: []
    },
    {
        id: 'USR-TEST-ADMIN',
        name: 'Super Admin',
        email: 'admin@qayess.io',
        role: 'admin',
        tier: 'unlimited',
        savingsScore: 0,
        isPremium: true,
        addresses: []
    }
];
export const MOCK_ORDERS = [
    {
        id: 'ORD-2024-001',
        userId: 'USR-001',
        items: [
            { productId: '1', quantity: 2, store: StoreName.MARJANE, city: 'Casablanca' },
            { productId: '4', quantity: 6, store: StoreName.MARJANE, city: 'Casablanca' }
        ],
        total: 239.00,
        status: 'completed',
        createdAt: '2024-02-10T14:30:00.000Z',
        mode: 'delivery',
        deliveryFee: 20,
        paymentMethod: 'cod'
    },
    {
        id: 'ORD-2024-002',
        userId: 'USR-002',
        items: [
            { productId: '21', quantity: 1, store: StoreName.CARREFOUR, city: 'Casablanca' },
            { productId: '23', quantity: 2, store: StoreName.CARREFOUR, city: 'Casablanca' }
        ],
        total: 117.00,
        status: 'pending',
        createdAt: '2024-02-15T09:15:00.000Z',
        mode: 'roadmap',
        deliveryFee: 0,
        paymentMethod: 'cod'
    }
];
export const MOCK_PROMO_CODES = [
    {
        id: 'PRM-001',
        code: 'WELCOME10',
        discountType: 'percent',
        discountValue: 10,
        minOrderAmount: 100,
        maxUses: 1000,
        currentUses: 42,
        startsAt: '2024-01-01T00:00:00.000Z',
        expiresAt: '2025-12-31T23:59:59.000Z',
        isActive: true
    },
    {
        id: 'PRM-002',
        code: 'RAMADAN50',
        discountType: 'fixed',
        discountValue: 50,
        minOrderAmount: 300,
        maxUses: 500,
        currentUses: 187,
        startsAt: '2024-03-01T00:00:00.000Z',
        expiresAt: '2024-04-30T23:59:59.000Z',
        isActive: false
    }
];
export const MOCK_PRICE_REPORTS = [
    {
        id: 'REP-001',
        productId: '1',
        productName: 'Huile de Table Lesieur 5L',
        store: StoreName.MARJANE,
        city: 'Casablanca',
        reportedPrice: 96.50,
        comment: 'Promo visible en rayon, non reflétée dans l\'app',
        userEmail: 'user@qayess.ma',
        timestamp: '2024-05-20T10:15:00.000Z',
        status: 'pending'
    },
    {
        id: 'REP-002',
        productId: '4',
        productName: 'Lait Entier Centrale 1L',
        store: StoreName.BIM,
        city: 'Tanger',
        reportedPrice: 6.80,
        userEmail: 'premium@qayess.ma',
        timestamp: '2024-05-21T08:40:00.000Z',
        status: 'verified'
    }
];
export const MOCK_AUDIT_LOGS = [
    {
        id: 'LOG-INIT-001',
        timestamp: '2024-01-01T00:00:00.000Z',
        action: 'SYSTEM_INIT',
        user: 'Système',
        userEmail: 'system@jaybi.ma',
        details: 'Initialisation de la plateforme Jaybi',
        type: 'info'
    },
    {
        id: 'LOG-INIT-002',
        timestamp: '2024-02-10T14:30:00.000Z',
        action: 'ORDER_CREATED',
        user: 'Amine Tazi',
        userEmail: 'user@qayess.ma',
        details: 'Commande ORD-2024-001 créée (delivery)',
        type: 'success'
    }
];
//# sourceMappingURL=mockData.js.map