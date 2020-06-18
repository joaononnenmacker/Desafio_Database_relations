import { inject, injectable } from 'tsyringe';

import AppError from '@shared/errors/AppError';

import IProductsRepository from '@modules/products/repositories/IProductsRepository';
import ICustomersRepository from '@modules/customers/repositories/ICustomersRepository';
import Order from '../infra/typeorm/entities/Order';
import IOrdersRepository from '../repositories/IOrdersRepository';

interface IProduct {
  id: string;
  quantity: number;
}

interface IRequest {
  customer_id: string;
  products: IProduct[];
}

@injectable()
class CreateOrderService {
  constructor(
    @inject('OrdersRepository')
    private ordersRepository: IOrdersRepository,
    @inject('ProductsRepository')
    private productsRepository: IProductsRepository,
    @inject('CustomersRepository')
    private customersRepository: ICustomersRepository,
  ) {}

  public async execute({ customer_id, products }: IRequest): Promise<Order> {
    const customer = await this.customersRepository.findById(customer_id);

    if (!customer) {
      throw new AppError('Customer not found!');
    }

    const productsId = products.map(product => {
      return {
        id: product.id,
      };
    });

    const allProducts = await this.productsRepository.findAllById(productsId);

    if (allProducts.length < productsId.length) {
      throw new AppError('Product not found');
    }

    const newProducts = allProducts.map(product => {
      products.forEach(item => {
        if (item.id === product.id) {
          if (item.quantity > product.quantity) {
            throw new AppError('Insufficient quantity of products');
          }
          product.quantity = item.quantity;
        }
      });
      return {
        product_id: product.id,
        price: product.price,
        quantity: product.quantity,
      };
    });

    const order = await this.ordersRepository.create({
      customer,
      products: newProducts,
    });

    const updatedProducts = await this.productsRepository.updateQuantity(
      products,
    );

    return order;
  }
}

export default CreateOrderService;
