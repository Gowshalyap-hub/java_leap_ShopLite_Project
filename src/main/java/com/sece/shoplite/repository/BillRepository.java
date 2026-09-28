package com.sece.shoplite.repository;

import com.sece.shoplite.entity.Bill;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;

public interface BillRepository extends JpaRepository<Bill, Long> {

    @Query("""
           SELECT COALESCE(SUM(b.totalAmount), 0)
           FROM Bill b
           WHERE b.billDate >= :start
           AND b.billDate < :end
           AND b.finalized = true
           """)
    Double getTotalSalesBetween(
            @Param("start") LocalDateTime start,
            @Param("end") LocalDateTime end
    );
}