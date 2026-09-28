package com.sece.shoplite.controller;

import com.sece.shoplite.entity.Bill;
import com.sece.shoplite.entity.BillItem;
import com.sece.shoplite.entity.Product;
import com.sece.shoplite.repository.BillRepository;
import com.sece.shoplite.repository.ProductRepository;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/bills")
@CrossOrigin(origins = "http://localhost:5173")
public class BillController {

    private final BillRepository billRepository;
    private final ProductRepository productRepository;

    public BillController(
            BillRepository billRepository,
            ProductRepository productRepository) {

        this.billRepository = billRepository;
        this.productRepository = productRepository;
    }

    // CREATE BILL
    @PostMapping
    @Transactional
    public ResponseEntity<?> createBill(@RequestBody Bill bill) {

        if (bill.getItems() == null || bill.getItems().isEmpty()) {
            return ResponseEntity.badRequest()
                    .body("Bill must contain at least one item");
        }

        double totalAmount = 0;

        // Validate products and calculate bill
        for (BillItem item : bill.getItems()) {

            if (item.getProduct() == null ||
                    item.getProduct().getId() == null) {

                return ResponseEntity.badRequest()
                        .body("Product ID is required");
            }

            if (item.getQuantity() <= 0) {
                return ResponseEntity.badRequest()
                        .body("Quantity must be greater than 0");
            }

            Product product = productRepository
                    .findById(item.getProduct().getId())
                    .orElse(null);

            if (product == null) {
                return ResponseEntity.badRequest()
                        .body("Product not found: "
                                + item.getProduct().getId());
            }

            if (bill.isFinalized()
                    && item.getQuantity() > product.getStockQuantity()) {

                return ResponseEntity.badRequest()
                        .body("Insufficient stock for product: "
                                + product.getName());
            }

            item.setProduct(product);
            item.setPrice(product.getPrice());

            double subtotal =
                    product.getPrice() * item.getQuantity();

            item.setSubtotal(subtotal);
            item.setBill(bill);

            totalAmount += subtotal;
        }

        bill.setBillDate(LocalDateTime.now());
        bill.setTotalAmount(totalAmount);

        // Reduce stock only when bill is finalized
        if (bill.isFinalized()) {

            for (BillItem item : bill.getItems()) {

                Product product = item.getProduct();

                int remainingStock =
                        product.getStockQuantity()
                                - item.getQuantity();

                product.setStockQuantity(remainingStock);

                productRepository.save(product);
            }
        }

        Bill savedBill = billRepository.save(bill);

        return ResponseEntity.ok(savedBill);
    }

    // GET ALL BILLS
    @GetMapping
    public List<Bill> getAllBills() {
        return billRepository.findAll();
    }

    // GET BILL BY ID
    @GetMapping("/{id}")
    public ResponseEntity<Bill> getBillById(
            @PathVariable Long id) {

        return billRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    // DAILY SALES
    @GetMapping("/sales")
    public double getDailySales(
            @RequestParam
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            LocalDate date) {

        LocalDateTime start = date.atStartOfDay();
        LocalDateTime end = date.plusDays(1).atStartOfDay();

        return billRepository.getTotalSalesBetween(
                start,
                end
        );
    }
}